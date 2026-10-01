/** Generate locally using cryptographic randomness; never persist or log the result. */
export function generatePassword():string {
 const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%&*+-=?'];
 const alphabet=groups.join('');
 function pick(limit:number){const bytes=new Uint32Array(1);const ceiling=Math.floor(0x100000000/limit)*limit;do{crypto.getRandomValues(bytes)}while(bytes[0]!>=ceiling);return bytes[0]!%limit;}
 const chars=groups.map(group=>group[pick(group.length)]!);
 while(chars.length<20)chars.push(alphabet[pick(alphabet.length)]!);
 for(let i=chars.length-1;i>0;i--){const j=pick(i+1);[chars[i],chars[j]]=[chars[j]!,chars[i]!];}
 return chars.join('');
}
