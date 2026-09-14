'use client';
let context:AudioContext|undefined;
export async function notificationTone() {
  try {
    context??=new AudioContext();
    if(context.state==='suspended')await context.resume();
    if(context.state!=='running')return false;
    const start=context.currentTime;
    for(const [offset,frequency] of [[0,660],[0.13,880]]){
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency!;
      gain.gain.setValueAtTime(0,start+offset!);gain.gain.linearRampToValueAtTime(0.08,start+offset!+0.02);gain.gain.exponentialRampToValueAtTime(0.001,start+offset!+0.2);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start+offset!);oscillator.stop(start+offset!+0.22);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }
    return true;
  }catch{return false;}
}
