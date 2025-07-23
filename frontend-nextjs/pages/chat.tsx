import { useEffect, useState } from "react";

export default function ChatPage() {
	const [message, setMessage] = useState("");

	useEffect(() => {
		fetch("http://localhost:5000/api/hello")
			.then((res) => res.json())
			.then((data) => setMessage(data.message))
			.catch((err) => console.error("Error fetching:", err));
	}, []);

	return <h1>Backend: {message}</h1>;
}
