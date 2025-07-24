const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

app.use(cors());

const waitingQueue = [];
const activePairs = new Map();

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);
	console.log(waitingQueue.length);
	//create room if others avalible
	if (waitingQueue.length > 0) {
		//pairing is FIFO
		const partner = waitingQueue.shift();
		const roomId = `room-${partner}-${socket.id}`;

		//join room and get partner to join
		socket.join(roomId);
		io.sockets.sockets.get(partner)?.join(roomId);

		//adds partner and self values to pairs
		//ex [id1, (id2, room_num_one)]
		//	 [id2, (id1, room_num_one)]
		activePairs.set(socket.id, { partnerId: partner, roomId });
		activePairs.set(partner, { partnerId: socket.id, roomId });

		//tells people added to the room theyve been matched
		io.to(roomId).emit("matched", { roomId });
	} else {
		//if no one avalilbe add self to queue
		waitingQueue.push(socket.id);
	}

	socket.on("send_message", (message) => {
		const pair = activePairs.get(socket.id);
		if (pair) {
			socket.to(pair.roomId).emit("receive_message", message);
		}
	});
	socket.on("next", () => {
		const pair = activePairs.get(socket.id);

		//delete room and pair
		if (pair) {
			const partnerId = pair.partnerId;
			const roomId = pair.roomId;

			const partnerSocket = io.sockets.sockets.get(partnerId);
			if (partnerSocket) {
				partnerSocket.leave(roomId);
				partnerSocket.emit("partner_disconnected");
				activePairs.delete(partnerId);
			}

			socket.leave(roomId);
			activePairs.delete(socket.id);
		}

		//add to q
		if (!waitingQueue.includes(socket.id)) {
			waitingQueue.push(socket.id);
		}

		//>1 since being pushed to queue before checking list
		if (waitingQueue.length > 1) {
			const first = waitingQueue.shift();
			const second = waitingQueue.shift();
			const newRoom = `room-${first}-${second}`;

			io.sockets.sockets.get(first)?.join(newRoom);
			io.sockets.sockets.get(second)?.join(newRoom);

			activePairs.set(first, { partnerId: second, roomId: newRoom });
			activePairs.set(second, { partnerId: first, roomId: newRoom });

			io.to(newRoom).emit("matched", { roomId: newRoom });
		}
	});
	//connect request
	socket.on("request_save_contact", () => {
		const pair = activePairs.get(socket.id);
		if (!pair) return;

		const partnerSocket = io.sockets.sockets.get(pair.partnerId);
		if (partnerSocket) {
			partnerSocket.emit("contact_request", { from: socket.id });
		}
	});
	//connect response
	socket.on("respond_save_contact", ({ from, accepted }) => {
		const requesterSocket = io.sockets.sockets.get(from);
		const responderId = socket.id;

		if (!requesterSocket) return;

		if (accepted) {
			//both users are connected/are added to contacts
			if (!userContacts.has(from)) userContacts.set(from, []);
			if (!userContacts.has(responderId)) userContacts.set(responderId, []);

			userContacts
				.get(from)
				.push({ id: responderId, nickname: "Saved Stranger" });
			userContacts
				.get(responderId)
				.push({ id: from, nickname: "Saved Stranger" });

			// tell both contact saved
			requesterSocket.emit("contact_saved", { success: true });
			socket.emit("contact_saved", { success: true });
		} else {
			requesterSocket.emit("contact_saved", {
				success: false,
				reason: "declined",
			});
		}
	});

	socket.on("disconnect", () => {
		const pair = activePairs.get(socket.id);

		//if user in waiting list remove them
		const index = waitingQueue.indexOf(socket.id);
		if (index !== -1) {
			waitingQueue.splice(index, 1);
		}

		//if user was paired up delete room
		if (pair) {
			const partner = pair.partnerId;
			const partnerSocket = io.sockets.sockets.get(partner);
			if (partnerSocket) {
				partnerSocket.leave(pair.roomId);
				partnerSocket.emit("partner_disconnected");
				activePairs.delete(partner);
			}
			activePairs.delete(socket.id);
		}

		console.log("User disconnected:", socket.id);
	});
});

server.listen(5000, () => {
	console.log("http://localhost:5000");
});
