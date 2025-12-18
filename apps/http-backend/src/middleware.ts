import  jwt, { JwtPayload }  from 'jsonwebtoken';
import { NextFunction, Request, Response } from "express";
import { JWT_SECRET } from "@repo/backend-common/config";

interface DecodedToken extends JwtPayload {
  userId: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;
  const decoded = jwt.verify(token as string, JWT_SECRET) as DecodedToken;

  if(decoded){
    req.userId = decoded.userId;
    next();
  }else {
    return res.status(401).send({ message: "Unauthorized" });
  }
}