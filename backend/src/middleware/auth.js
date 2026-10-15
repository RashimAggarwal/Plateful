import jwt from 'jsonwebtoken';
export function authenticate(req,res,next){const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({error:'Please sign in to continue.'});try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET);next()}catch{return res.status(401).json({error:'Your session has expired. Please sign in again.'})}}
export const allow=(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({error:'You do not have permission to do that.'});
