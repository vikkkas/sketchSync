import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { CreateUserSchema } from "@repo/common/types";

const app = express();

app.post("/signup", (req, res) => {
  // Handle user signup logic here
  const data = CreateUserSchema.safeParse(req.body);
  if (!data.success) {
    return res.status(400).send({ message: "Invalid request data" });
  }
  res.status(201).send({ message: "User signed up successfully" });
});

app.post("/signin", (req, res) => {
  const userId = 1;

  const token = jwt.sign(
    {
      userId,
    },
    JWT_SECRET
  );

  res.json({ token });
});

app.post("/room", (req, res) => {
  // Handle user signup logic here
  res.status(201).send({ message: "User signed up successfully" });
});

app.listen(3000, () => {
  console.log("HTTP backend is running on http://localhost:3000");
});
