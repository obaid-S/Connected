import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Link from "next/link";

const socket = io("http://localhost:5000");

export default function ChatPage() {
	const [message, setMessage] = useState("");
	const [userSize, setUserSize] = useState("0");
	const [waitingUsers, setWaitingUsers] = useState("0");
	const [messages, setMessages] = useState<string[]>([]);
	const [status, setStatus] = useState("Waiting for partner...");
	const [contactRequest, setContactRequest] = useState<string | null>(null);

	const handleSaveContact = () => {
		socket.emit("request_save_contact");
	};

	//saving contacts
	useEffect(() => {
		socket.on("contact_request", ({ from }) => {
			setContactRequest(from);
		});

		socket.on("contact_saved", ({ success, reason }) => {
			if (success) {
				alert("Contact saved!");
			} else {
				alert(`Contact not saved: ${reason}`);
			}
		});

		return () => {
			socket.off("contact_request");
			socket.off("contact_saved");
		};
	}, []);

	//getting # of users
	useEffect(() => {
		socket.on("active_users", (size: number) => {
			setUserSize(size.toString());
		});
		socket.on("waiting_users", (size: number) => {
			setWaitingUsers(size.toString());
		});
		socket.emit("get_size_counts");

		return () => {
			socket.off("active_users");
			socket.off("waiting_users");
		};
	}, []);

	//matching and messaging
	useEffect(() => {
		socket.emit("ready_for_pair");

		socket.on("matched", ({ roomId }) => {
			console.log("Matched in room:", roomId);
			setStatus("You’re connected to a stranger!");
		});

		socket.on("receive_message", (msg: string) => {
			setMessages((prev) => [...prev, msg]);
		});

		socket.on("partner_disconnected", () => {
			setStatus("Partner left. Waiting...");
		});

		return () => {
			socket.disconnect();
		};
	}, []);
	const handleNext = () => {
		setMessages([]);
		socket.emit("next");
	};

	const sendMessage = () => {
		if (message.trim() !== "") {
			socket.emit("send_message", message);
			setMessages((prev) => [...prev, message]);
			setMessage("");
		}
	};

	return (
		<div className="p-4 max-w-md mx-auto">
			<h1 className="text-xl font-bold mb-4">Chat</h1>
			<h1 className="text-xl font-bold mb-4">
				Number of waiting users: {waitingUsers}
				Number of users: {userSize}
			</h1>
			<div className="mb-4 h-64 overflow-y-scroll border rounded p-2">
				{messages.map((msg, i) => (
					<div key={i} className="mb-1">
						{msg}
					</div>
				))}
			</div>
			<Link href="/contacts">
				<span className="text-blue-500 underline">View Contacts</span>
			</Link>
			<div className="flex justify-between mb-4">
				<h1 className="text-xl font-bold">Stranger Chat</h1>
				<button
					onClick={handleNext}
					className="bg-red-500 text-white px-3 py-1 rounded"
				>
					Next
				</button>
			</div>
			<h1 className="text-xl font-bold mb-4">{status}</h1>

			<div className="flex gap-2">
				<input
					type="text"
					className="flex-grow border p-2 rounded"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
				/>
				<button
					className="bg-blue-500 text-white px-4 py-2 rounded"
					onClick={sendMessage}
				>
					Send
				</button>
			</div>
			<button
				onClick={handleSaveContact}
				className="bg-green-500 text-white px-3 py-1 rounded"
			>
				Save Contact
			</button>
			{contactRequest && (
				<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
					<div className="bg-white p-4 rounded shadow-md text-center">
						<p className="mb-4">
							Stranger wants to save you as a contact. Accept?
						</p>
						<div className="flex justify-center gap-4">
							<button
								className="bg-green-500 text-white px-4 py-1 rounded"
								onClick={() => {
									socket.emit("respond_save_contact", {
										from: contactRequest,
										accepted: true,
									});
									setContactRequest(null);
								}}
							>
								Accept
							</button>
							<button
								className="bg-red-500 text-white px-4 py-1 rounded"
								onClick={() => {
									socket.emit("respond_save_contact", {
										from: contactRequest,
										accepted: false,
									});
									setContactRequest(null);
								}}
							>
								Decline
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
