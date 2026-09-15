import { useMemo, useState } from "react"
import { IconCards, IconChartBar, IconReceipt, IconRotate, IconSparkles } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import "./App.css"

type Suit = "♠" | "♥" | "♦" | "♣"
type PlayingCard = { rank: string; suit: Suit; value: number }
type Result = { title: string; detail: string; delta: number }
const suits: Suit[] = ["♠", "♥", "♦", "♣"]
const ranks = [{r:"A",v:11},{r:"2",v:2},{r:"3",v:3},{r:"4",v:4},{r:"5",v:5},{r:"6",v:6},{r:"7",v:7},{r:"8",v:8},{r:"9",v:9},{r:"10",v:10},{r:"J",v:10},{r:"Q",v:10},{r:"K",v:10}]
const deck = () => suits.flatMap(suit => ranks.map(({r,v}) => ({rank:r,suit,value:v})))
const shuffled = () => deck().sort(() => Math.random() - .5)
const score = (hand: PlayingCard[]) => { let n=hand.reduce((a,c)=>a+c.value,0), aces=hand.filter(c=>c.rank==="A").length; while(n>21&&aces--){n-=10}; return n }
const red = (c: PlayingCard) => c.suit === "♥" || c.suit === "♦"

function PlayingCardView({ card, hidden=false }:{card?:PlayingCard;hidden?:boolean}) {
  if(hidden) return <div className="playing-card card-back" aria-label="Hidden card"><span>21</span></div>
  if(!card) return <div className="playing-card card-empty" aria-hidden="true" />
  return <div className={`playing-card ${red(card)?"red":""}`} aria-label={`${card.rank} of ${card.suit}`}><span className="rank">{card.rank}</span><span className="suit">{card.suit}</span></div>
}

export default function App(){
  const [balance,setBalance]=useState(1000); const [betText,setBetText]=useState("010")
  const bet=Math.max(5,Math.min(balance,Number(betText)||10)); const [player,setPlayer]=useState<PlayingCard[]>([]); const [dealer,setDealer]=useState<PlayingCard[]>([])
  const [pile,setPile]=useState<PlayingCard[]>(shuffled()); const [playing,setPlaying]=useState(false); const [reveal,setReveal]=useState(false)
  const [headline,setHeadline]=useState("Place your imaginary bet."); const [subline,setSubline]=useState("Standard blackjack rules. Questionable cosmic justice.")
  const [history,setHistory]=useState<Result[]>([{title:"Table opened",detail:"The dealer is stretching.",delta:0}]); const [suspicion,setSuspicion]=useState(16)
  const pScore=score(player), dScore=score(dealer); const canDouble=playing&&player.length===2&&balance>=bet
  const next=()=>{const copy=[...pile]; const card=copy.pop()!; setPile(copy.length<8?shuffled():copy); return card}
  const settle=(title:string,detail:string,delta:number,odd=false)=>{setPlaying(false);setReveal(true);setHeadline(title);setSubline(detail);setBalance(x=>x+delta);setSuspicion(x=>Math.min(100,x+(odd?34:9)));setHistory(h=>[{title:odd?"ONE. EXACT. CARD.":title,detail,delta},...h].slice(0,5))}
  const deal=()=>{if(balance<bet)return; const d=shuffled(), p=[d.pop()!,d.pop()!], house=[d.pop()!,d.pop()!]; setPile(d);setPlayer(p);setDealer(house);setReveal(false);setPlaying(true);setHeadline("Your move.");setSubline("Hit, stand, or make a financially meaningless mistake.");if(score(p)===21)setTimeout(()=>finish(p,house,d,true),180)}
  const finish=(p=player, start=dealer, source=pile, force=false)=>{let house=[...start], d=[...source]; const ps=score(p); const betrayal=force||((Math.random()<.38)&&ps>=18&&ps<=21); if(betrayal&&ps<=21){const need=ps-score(house);const exact=d.findIndex(c=>c.value===need&&score(house)+c.value<=21);if(exact>=0){house.push(d.splice(exact,1)[0]);setDealer(house);setPile(d);return settle("Dealer wins by one.",`Naturally, the dealer found the only ${house.at(-1)!.rank} that did it.`,-bet,true)}} while(score(house)<17)house.push(d.pop()!);setDealer(house);setPile(d);const ds=score(house);if(ps>21)settle("You busted.","A timeless classic.",-bet);else if(ds>21||ps>ds)settle("You won.","The table has noted this administrative error.",bet);else if(ps===ds)settle("Push.","Nobody wins. Especially not emotionally.",0);else settle("Dealer wins.","Completely ordinary. Nothing to inspect.",-bet)}
  const hit=()=>{const c=next(), hand=[...player,c];setPlayer(hand);if(score(hand)>21)settle("You busted.","One card past perfect.",-bet)}
  const double=()=>{const c=next(), hand=[...player,c];setPlayer(hand);if(score(hand)>21)settle("You doubled and busted.","Efficient.",-bet*2);else finish(hand,dealer,pile.filter(x=>x!==c))}
  const nav=useMemo(()=>[{label:"Blackjack",icon:IconCards,active:true},{label:"Luck audit",icon:IconChartBar},{label:"Receipts",icon:IconReceipt}],[])
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-tile">21</span><span>Almost</span></div><NavigationMenu orientation="vertical" className="nav"><NavigationMenuList className="nav-list">{nav.map(({label,icon:Icon,active})=><NavigationMenuItem key={label}><button className={`nav-link ${active?"active":""}`} disabled={!active}><Icon size={17}/><span>{label}</span>{active&&<span className="live-dot"/>}</button></NavigationMenuItem>)}</NavigationMenuList></NavigationMenu><div className="sidebar-note"><strong>Private table.</strong><span>Just you, the dealer, and statistically fascinating luck.</span></div></aside>
    <main className="workspace"><header className="topbar"><div className="table-status"><span className="pulse"/>Table live</div><div className="badges"><Badge variant="outline">Fake credits</Badge><Badge variant="secondary">Private table</Badge></div></header>
      <section className="table-wrap"><div className="dots" aria-hidden="true"/><div className="table-inner">
        <div className="hand-row"><div className="hand-meta"><span>Dealer</span><strong>{reveal?dScore:(dealer.length?"?":"-")}</strong></div><div className="cards">{dealer.length?dealer.map((c,i)=><PlayingCardView key={i} card={c} hidden={!reveal&&i===1}/>):<><PlayingCardView/><PlayingCardView/></>}</div></div>
        <div className="outcome" aria-live="polite"><IconSparkles size={17}/><div><strong>{headline}</strong><span>{subline}</span></div></div>
        <div className="hand-row"><div className="hand-meta"><span>You</span><strong>{player.length?pScore:"-"}</strong></div><div className="cards">{player.length?player.map((c,i)=><PlayingCardView key={i} card={c}/>):<><PlayingCardView/><PlayingCardView/></>}</div></div>
        <div className="actions"><Button size="lg" onClick={deal} disabled={playing||balance<bet}>{playing?"Round in play":`Deal ${bet} credits`}</Button><Button size="lg" variant="outline" onClick={hit} disabled={!playing}>Hit</Button><Button size="lg" variant="outline" onClick={()=>finish()} disabled={!playing}>Stand</Button><Button size="lg" variant="ghost" onClick={double} disabled={!canDouble}>Double-ish</Button></div>
      </div></section>
    </main>
    <aside className="inspector"><div><p className="eyebrow">House terminal / 01</p><h1>ALMOST<br/>TWENTY-ONE</h1><p className="lede">Blackjack with normal rules, house credits, and uncannily specific outcomes.</p></div><Separator/>
      <Card className="balance-card"><CardHeader><CardDescription>Available fiction</CardDescription><CardTitle>{balance.toLocaleString()} <span>credits</span></CardTitle></CardHeader><CardContent><label htmlFor="bet-input">Pretend bet</label><InputOTP id="bet-input" maxLength={3} value={betText} onChange={setBetText} containerClassName="bet-input"><InputOTPGroup>{[0,1,2].map(i=><InputOTPSlot key={i} index={i}/>)}</InputOTPGroup></InputOTP><p className="field-note">Actual Kobra Input OTP component. Type 005-999.</p></CardContent></Card>
      <section><div className="section-head"><span>Suspicion level</span><strong>{suspicion}%</strong></div><Progress value={suspicion}/><p className="field-note">A purely decorative compliance metric.</p></section><Separator/>
      <section><div className="section-head"><span>Recent nonsense</span><Button variant="ghost" size="icon-sm" aria-label="Reset table" onClick={()=>location.reload()}><IconRotate/></Button></div><div className="ledger">{history.map((x,i)=><div className="ledger-row" key={`${x.title}-${i}`}><div><strong>{x.title}</strong><span>{x.detail}</span></div><b className={x.delta<0?"loss":x.delta>0?"win":""}>{x.delta>0?"+":""}{x.delta}</b></div>)}</div></section><div className="legal"><strong>HOUSE CREDITS ONLY.</strong> No deposits, purchases, prizes, cash-out, or real-value wagering.</div>
    </aside>
  </div>
}
