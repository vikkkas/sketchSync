import {z} from 'zod';

export const CreateUserSchema = z.object({
    username: z.string().min(3).max(30),
    password: z.string().min(6),
    name: z.string().email(),
})

export const SigninSchema = z.object({
    usename : z.string().min(3).max(30),
    password : z.string().min(6),
})

export const CreateRoomSchema = z.object({
    name: z.string().min(3).max(50),
})