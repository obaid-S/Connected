import React, { useEffect, useState } from "react";

export default function ContactsPage() {
	const [contacts, setContacts] = useState<any[]>([]);

	useEffect(() => {
		// Replace 'yourSocketId' with real socket id if you store it
		fetch(`/api/contacts?id=yourSocketId`)
			.then((res) => res.json())
			.then((data) => setContacts(data.contacts));
	}, []);

	return (
		<div className="p-4 max-w-md mx-auto">
			<h1 className="text-xl font-bold mb-4">Saved Contacts</h1>
			{contacts.length === 0 ? (
				<p className="text-gray-500">No contacts saved.</p>
			) : (
				<ul className="space-y-2">
					{contacts.map((contact, i) => (
						<li
							key={i}
							className="border p-2 rounded bg-white shadow flex justify-between"
						>
							<span>{contact.nickname || contact.id}</span>
							{/* Optional re-chat button */}
							{/* <button className="text-blue-600">Message</button> */}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
