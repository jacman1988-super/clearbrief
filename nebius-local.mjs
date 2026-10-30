import readline from 'node:readline';
import {start} from './server.mjs';
function hidden(prompt) {
  if(!process.stdin.isTTY)throw new Error('Otwórz plik CMD w zwykłej konsoli Windows.');
  return new Promise((resolve,reject)=>{let value='';const prior=process.stdin.isRaw;readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();process.stdout.write(prompt);
    const finish=()=>{process.stdin.off('keypress',key);process.stdin.setRawMode(!!prior);process.stdin.pause();process.stdout.write('\n');};
    const key=(text,info={})=>{if(info.ctrl&&['c','z'].includes(info.name)){finish();reject(new Error('Anulowano.'));return;}if(['return','enter'].includes(info.name)){finish();resolve(value);return;}if(info.name==='backspace'){if(value){value=value.slice(0,-1);process.stdout.write('\b \b');}return;}if(info.ctrl||info.meta)return;for(const c of text??''){if(/[\x21-\x7e]/.test(c)&&value.length<1024){value+=c;process.stdout.write('*');}}};process.stdin.on('keypress',key);
  });
}
try {
  console.log('ClearBrief — prywatne połączenie Nebius\nUwaga: aktualny onboarding Nebius wymaga karty i opisuje automatyczne obciążenia.\nNie uruchamiaj połączenia, dopóki nie masz potwierdzonej ścieżki spełniającej ustalony budżet 0 zł.\nBezpłatne kredyty same nie gwarantują braku obciążeń. Ta aplikacja nie sprawdza salda ani nie blokuje rozliczeń usługodawcy.\nLimit: 4 próby łącznie, także po restarcie; bez automatycznych ponowień. To nie jest limit wydatków konta.\n');
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  const confirmed=await new Promise(r=>rl.question('Czy potwierdzasz dostępne darmowe kredyty i użycie wyłącznie ich? Wpisz TAK: ',r));rl.close();
  if(confirmed.trim().toUpperCase()!=='TAK')throw new Error('Nie uruchomiono połączenia. Tryb lokalny pozostaje dostępny.');
  let key=await hidden('Klucz API Nebius (ukryty, nie wpisuj do czatu): ');
  const server=start({key,freeCreditsConfirmed:true});key='';
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
} catch(error){console.log(error.message);process.exitCode=1;}
