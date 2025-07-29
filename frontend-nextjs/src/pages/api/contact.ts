import type { NextApiRequest, NextApiResponse } from "next";

let userContacts: Record<string, any[]> = {}; // TEMP

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	const socketId = req.query.id as string;

	if (!socketId) {
		return res.status(400).json({ error: "Missing id" });
	}

	const contacts = userContacts[socketId] || [];
	res.status(200).json({ contacts });
}
