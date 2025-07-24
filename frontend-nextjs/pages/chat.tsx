import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function ChatPage() {
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState<string[]>([]);
	const [status, setStatus] = useState("Waiting for partner...");
	const handleSaveContact = () => {
		socket.emit("request_save_contact");
	};
	useEffect(() => {
		socket.on("contact_request", ({ from }) => {
			const confirm = window.confirm(
				"Stranger wants to save you as a contact. Accept?"
			);
			socket.emit("respond_save_contact", { from, accepted: confirm });
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

	useEffect(() => {
		socket.on("matched", ({ roomId }) => {
			console.log("Matched in room:", roomId);
			setStatus("You’re connected to a stranger!");
		});

		socket.on("receive_message", (msg: string) => {
			setMessages((prev) => [...prev, msg]);
		});

		socket.on("partner_disconnected", () => {
			alert("Your partner disconnected.");
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
			<div className="mb-4 h-64 overflow-y-scroll border rounded p-2">
				{messages.map((msg, i) => (
					<div key={i} className="mb-1">
						{msg}
					</div>
				))}
			</div>
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
		</div>
	);
}
