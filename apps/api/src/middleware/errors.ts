import type {ErrorRequestHandler} from 'express';
import {ZodError} from 'zod';
import {Prisma} from '../generated/prisma/client.js';
import {AppError} from '../utils/errors.js';
import {MulterError} from 'multer';
export const errorHandler:ErrorRequestHandler=(error:unknown,req,res,_next)=>{
 let status=500,message='Something went wrong. Please try again.',errors:Array<{path:string;message:string}>=[];
 if(error instanceof AppError){status=error.status;message=error.message;errors=error.errors}
 else if(error instanceof ZodError){status=422;message='Please correct the highlighted fields.';errors=error.issues.map(i=>({path:i.path.join('.'),message:i.message}))}
 else if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'){status=409;message='That email, username or eFootball username is already in use. Choose another or log in to your existing account.'}
 else if(error instanceof SyntaxError){status=400;message='Request body is not valid JSON.'}
 else if(error instanceof MulterError){status=413;message='Upload failed. Choose one image under 5 MB.'}
 if(status===500)console.error(JSON.stringify({requestId:req.requestId,errorType:error instanceof Error?error.name:'UnknownError'}));
 res.status(status).json({success:false,message,errors,requestId:req.requestId});
};
