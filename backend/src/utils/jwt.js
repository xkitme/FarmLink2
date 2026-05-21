import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export const signToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn })

export const signRefreshToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn })

export const verifyToken = (token) =>
  jwt.verify(token, config.jwt.secret)
