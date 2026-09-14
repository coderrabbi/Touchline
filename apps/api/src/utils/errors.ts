export class AppError extends Error{constructor(public status:number,message:string,public errors:Array<{path:string;message:string}>=[]){super(message)}}
