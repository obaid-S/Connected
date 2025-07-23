const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for requests from localhost:3000 (your Next.js frontend)
app.use(
	cors({
		origin: "http://localhost:3000",
		credentials: true,
	})
);

//test route
app.get("/api/hello", (req, res) => {
	res.json({ message: "test" });
});

//start
app.listen(PORT, () => {
	console.log(`http://localhost:${PORT}`);
});
