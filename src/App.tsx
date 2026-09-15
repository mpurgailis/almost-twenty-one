import { useEffect, useState } from "react"
import {
  IconBook,
  IconCards,
  IconCoin,
  IconCommand,
  IconExposure,
  IconHandStop,
  IconPlus,
  IconReceipt,
  IconRotate,
  IconSparkles,
  IconVolume,
} from "@tabler/icons-react"

// Kobra registry components (genuine, from https://kobra.systems/r/)
import { CommandMenu, openCommandMenu, type CommandMenuAction } from "@/components/ui/command-menu"
import { HalftoneDots } from "@/components/ui/halftone-dots"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { SoundEffects, SoundToggle, setSoundMuted, useSoundMuted } from "@/components/ui/sound"
import { Toasts, toast } from "@/components/ui/toast"

// shadcn components supporting the Kobra surfaces
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import "./App.css"

type Suit = "♠" | "♥" | "♦" | "♣"
type PlayingCard = { rank: string; suit: Suit; value: number }
type Round = { n: number; result: string; delta: number }

const suits: Suit[] = ["♠", "♥", "♦", "♣"]
const ranks = [
  { r: "A", v: 11 }, { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 },
  { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 }, { r: "10", v: 10 },
  { r: "J", v: 10 }, { r: "Q", v: 10 }, { r: "K", v: 10 },
]
const deck = () => suits.flatMap((suit) => ranks.map(({ r, v }) => ({ rank: r, suit, value: v })))
const shuffled = () => deck().sort(() => Math.random() - 0.5)
const score = (hand: PlayingCard[]) => {
  let n = hand.reduce((a, c) => a + c.value, 0)
  let aces = hand.filter((c) => c.rank === "A").length
  while (n > 21 && aces--) n -= 10
  return n
}
const red = (c: PlayingCard) => c.suit === "♥" || c.suit === "♦"

const START_BALANCE = 1000
const CHIPS = [10, 25, 50, 100]

function PlayingCardView({ card, hidden = false }: { card?: PlayingCard; hidden?: boolean }) {
  if (hidden)
    return (
      <div className="playing-card card-back" aria-label="Hidden card">
        <span>21</span>
      </div>
    )
  if (!card) return <div className="playing-card card-empty" aria-hidden="true" />
  return (
    <div className={`playing-card ${red(card) ? "red" : ""}`} aria-label={`${card.rank} of ${card.suit}`}>
      <span>{card.rank}</span>
      <span className="suit">{card.suit}</span>
    </div>
  )
}

function TableInner() {
  const [balance, setBalance] = useState(START_BALANCE)
  const [bet, setBet] = useState(25)
  const [player, setPlayer] = useState<PlayingCard[]>([])
  const [dealer, setDealer] = useState<PlayingCard[]>([])
  const [pile, setPile] = useState<PlayingCard[]>(shuffled())
  const [playing, setPlaying] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [headline, setHeadline] = useState("Place your imaginary bet.")
  const [subline, setSubline] = useState("Standard blackjack rules. Questionable cosmic justice.")
  const [rounds, setRounds] = useState<Round[]>([])
  const [suspicion, setSuspicion] = useState(16)
  const [rulesOpen, setRulesOpen] = useState(false)
  const muted = useSoundMuted()

  const pScore = score(player)
  const dScore = score(dealer)
  const maxBet = Math.max(5, Math.min(500, balance))
  const effectiveBet = Math.max(5, Math.min(bet, maxBet, balance))
  const canDouble = playing && player.length === 2 && balance >= effectiveBet * 2
  const broke = balance < 5

  const next = () => {
    const copy = [...pile]
    const card = copy.pop()!
    setPile(copy.length < 8 ? shuffled() : copy)
    return card
  }

  const settle = (title: string, detail: string, delta: number, odd = false) => {
    setPlaying(false)
    setReveal(true)
    setHeadline(title)
    setSubline(detail)
    setBalance((x) => x + delta)
    setSuspicion((x) => Math.min(100, x + (odd ? 34 : 9)))
    setRounds((h) => [{ n: (h[0]?.n ?? 0) + 1, result: odd ? "ONE. EXACT. CARD." : title, delta }, ...h].slice(0, 12))
    toast({
      message: odd ? detail : title,
      state: odd ? "warning" : delta > 0 ? "success" : delta < 0 ? "error" : "info",
    })
  }

  const finish = (p = player, start = dealer, source = pile, force = false) => {
    const house = [...start]
    const d = [...source]
    const ps = score(p)
    const betrayal = force || (Math.random() < 0.38 && ps >= 18 && ps <= 21)
    if (betrayal && ps <= 21) {
      const need = ps - score(house)
      const exact = d.findIndex((c) => c.value === need && score(house) + c.value <= 21)
      if (exact >= 0) {
        house.push(d.splice(exact, 1)[0])
        setDealer(house)
        setPile(d)
        return settle("Dealer wins by one.", `Naturally, the dealer found the only ${house.at(-1)!.rank} that did it.`, -effectiveBet, true)
      }
    }
    while (score(house) < 17) house.push(d.pop()!)
    setDealer(house)
    setPile(d)
    const ds = score(house)
    if (ps > 21) settle("You busted.", "A timeless classic.", -effectiveBet)
    else if (ds > 21 || ps > ds) settle("You won.", "The table has noted this administrative error.", effectiveBet)
    else if (ps === ds) settle("Push.", "Nobody wins. Especially not emotionally.", 0)
    else settle("Dealer wins.", "Completely ordinary. Nothing to inspect.", -effectiveBet)
  }

  const deal = () => {
    if (playing || balance < effectiveBet) return
    const d = shuffled()
    const p = [d.pop()!, d.pop()!]
    const house = [d.pop()!, d.pop()!]
    setPile(d)
    setPlayer(p)
    setDealer(house)
    setReveal(false)
    setPlaying(true)
    setHeadline("Your move.")
    setSubline("Hit, stand, or make a financially meaningless mistake.")
    if (score(p) === 21) setTimeout(() => finish(p, house, d, true), 180)
  }

  const hit = () => {
    if (!playing) return
    const hand = [...player, next()]
    setPlayer(hand)
    if (score(hand) > 21) settle("You busted.", "One card past perfect.", -effectiveBet)
  }

  const double = () => {
    if (!canDouble) return
    const hand = [...player, next()]
    setPlayer(hand)
    if (score(hand) > 21) settle("You doubled and busted.", "Efficient.", -effectiveBet * 2)
    else finish(hand, dealer, pile)
  }

  const newTable = () => {
    setBalance(START_BALANCE)
    setPlayer([])
    setDealer([])
    setPlaying(false)
    setReveal(false)
    setRounds([])
    setSuspicion(16)
    setHeadline("Fresh table.")
    setSubline("Same dealer. Completely ordinary odds, presumably.")
    toast({ message: "Fresh table. The dealer denies everything.", state: "info" })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest("input, textarea, [contenteditable], .command-overlay, [role='dialog']")) return
      const k = e.key.toLowerCase()
      if (k === "h") hit()
      else if (k === "s") playing && finish()
      else if (k === "d") deal()
      else if (k === "x") double()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const commands: CommandMenuAction[] = [
    { id: "deal", label: "Deal a round", keywords: ["start", "bet"], icon: <IconCards size={16} />, shortcut: ["D"], hidden: playing || broke, action: deal },
    { id: "hit", label: "Hit", keywords: ["card", "draw"], icon: <IconPlus size={16} />, shortcut: ["H"], hidden: !playing, action: hit },
    { id: "stand", label: "Stand", keywords: ["stay", "hold"], icon: <IconHandStop size={16} />, shortcut: ["S"], hidden: !playing, action: () => finish() },
    { id: "double", label: "Double-ish", keywords: ["double", "down"], icon: <IconExposure size={16} />, shortcut: ["X"], hidden: !canDouble, action: double },
    { id: "rules", label: "Read the house rules", keywords: ["help", "rules"], icon: <IconBook size={16} />, action: () => setRulesOpen(true) },
    { id: "sound", label: muted ? "Unmute table sounds" : "Mute table sounds", keywords: ["audio", "volume"], icon: <IconVolume size={16} />, action: () => setSoundMuted(!muted) },
    { id: "reset", label: "Open a fresh table", keywords: ["reset", "restart"], icon: <IconRotate size={16} />, action: newTable },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-foreground font-mono text-xs font-bold text-background">21</span>
            <h1 className="hidden text-sm font-semibold tracking-tight sm:block">Almost Twenty-One</h1>
          </div>
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <NavigationMenuItem>
                <button className={navigationMenuTriggerStyle()} data-active aria-current="page">
                  <IconCards size={15} /> Table
                </button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <button className={navigationMenuTriggerStyle()} onClick={() => setRulesOpen(true)}>
                  <IconBook size={15} /> House rules
                </button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <button className={navigationMenuTriggerStyle()} onClick={() => openCommandMenu()}>
                  <IconCommand size={15} /> Commands <Kbd className="ml-1">Cmd K</Kbd>
                </button>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">Fake credits</Badge>
            <Badge variant="secondary" className="hidden sm:inline-flex">Private table</Badge>
            <SoundToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="relative overflow-hidden border-0 bg-transparent py-0 shadow-none">
          <div className="relative h-full overflow-hidden rounded-xl border bg-[#0c1a12]">
            <HalftoneDots src={`${import.meta.env.BASE_URL}felt.svg`} accent="#2f6b4a" className="absolute inset-0 opacity-60" />
            <div className="relative grid min-h-[560px] content-between gap-6 p-5 sm:p-8">
              <div className="grid gap-3">
                <div className="flex items-baseline justify-between text-[#e8e4d8]">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase opacity-70">Dealer</span>
                  <strong className="font-mono text-2xl">{reveal ? dScore : dealer.length ? "?" : "-"}</strong>
                </div>
                <div className="flex min-h-[128px] flex-wrap items-center gap-2.5">
                  {dealer.length
                    ? dealer.map((c, i) => <PlayingCardView key={i} card={c} hidden={!reveal && i === 1} />)
                    : [<PlayingCardView key="a" />, <PlayingCardView key="b" />]}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-3.5 text-[#e8e4d8] backdrop-blur-sm" aria-live="polite">
                <IconSparkles size={17} className="mt-0.5 shrink-0 opacity-70" />
                <div className="grid gap-0.5">
                  <strong className="text-sm">{headline}</strong>
                  <span className="text-xs opacity-70">{subline}</span>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex min-h-[128px] flex-wrap items-center gap-2.5">
                  {player.length
                    ? player.map((c, i) => <PlayingCardView key={i} card={c} />)
                    : [<PlayingCardView key="a" />, <PlayingCardView key="b" />]}
                </div>
                <div className="flex items-baseline justify-between text-[#e8e4d8]">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase opacity-70">You</span>
                  <strong className="font-mono text-2xl">{player.length ? pScore : "-"}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="lg" className="min-h-11" data-sound="select" onClick={deal} disabled={playing || broke}>
                  {broke ? "Table credit exhausted" : playing ? "Round in play" : `Deal ${effectiveBet} credits`}
                </Button>
                <Button size="lg" className="min-h-11" variant="outline" onClick={hit} disabled={!playing}>
                  Hit <Kbd>H</Kbd>
                </Button>
                <Button size="lg" className="min-h-11" variant="outline" onClick={() => finish()} disabled={!playing}>
                  Stand <Kbd>S</Kbd>
                </Button>
                <Button size="lg" className="min-h-11" variant="ghost" onClick={double} disabled={!canDouble}>
                  Double-ish <Kbd>X</Kbd>
                </Button>
                {broke && (
                  <Button size="lg" className="min-h-11" variant="secondary" onClick={newTable}>
                    <IconRotate size={16} /> New table
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Available fiction</CardDescription>
              <CardTitle className="font-mono text-3xl tracking-tight">
                {balance.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">credits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="bet-slider" className="text-xs font-medium">Pretend bet</label>
                  <span className="font-mono text-sm font-semibold">{effectiveBet}</span>
                </div>
                <Slider
                  id="bet-slider"
                  aria-label="Pretend bet"
                  min={5}
                  max={maxBet}
                  step={5}
                  value={effectiveBet}
                  disabled={playing || broke}
                  onValueChange={(v) => setBet(Array.isArray(v) ? Number(v[0]) : Number(v))}
                />
              </div>
              <ToggleGroup
                value={[String(effectiveBet)]}
                onValueChange={(v) => v.length && setBet(Number(v[0]))}
                variant="outline"
                className="w-full"
              >
                {CHIPS.map((c) => (
                  <ToggleGroupItem key={c} value={String(c)} disabled={playing || c > balance} className="min-h-11 flex-1" aria-label={`Bet ${c} credits`}>
                    {c}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="grid gap-1.5">
                <label htmlFor="bet-exact" className="text-xs font-medium">Exact amount</label>
                <Input
                  id="bet-exact"
                  type="number"
                  min={5}
                  max={maxBet}
                  step={5}
                  value={effectiveBet}
                  disabled={playing || broke}
                  onChange={(e) => setBet(Number(e.target.value) || 5)}
                />
              </div>
            </CardContent>
            <CardFooter className="text-[11px] text-muted-foreground">
              Credits are pretend. The disappointment is complimentary.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Suspicion level</CardDescription>
              <CardTitle className="font-mono text-xl">{suspicion}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={suspicion} aria-label="Suspicion level" />
            </CardContent>
            <CardFooter className="text-[11px] text-muted-foreground">
              A purely decorative compliance metric.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardDescription>Receipts</CardDescription>
                <CardTitle className="flex items-center gap-2 text-base"><IconReceipt size={16} /> Recent rounds</CardTitle>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Open a fresh table" onClick={newTable}>
                <IconRotate />
              </Button>
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No rounds yet. The dealer waits.</p>
              ) : (
                <ScrollArea className="h-56">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rounds.map((r) => (
                        <TableRow key={r.n}>
                          <TableCell className="font-mono text-muted-foreground">{r.n}</TableCell>
                          <TableCell className="text-xs">{r.result}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-semibold ${r.delta < 0 ? "text-error" : r.delta > 0 ? "text-success" : "text-muted-foreground"}`}>
                            {r.delta > 0 ? "+" : ""}{r.delta}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Alert>
            <IconCoin className="size-4" />
            <AlertTitle>House credits only</AlertTitle>
            <AlertDescription>
              Pretend money for a private table. No deposits, purchases, prizes, cash-out, or real-value wagering.
            </AlertDescription>
          </Alert>
        </div>
      </main>

      <Separator />
      <footer className="mx-auto w-full max-w-6xl px-4 py-3 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        Almost Twenty-One - a completely ordinary blackjack table
      </footer>

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>House rules</DialogTitle>
            <DialogDescription>Everything here is ordinary. Please stop asking.</DialogDescription>
          </DialogHeader>
          <Accordion defaultValue={["round"]}>
            <AccordionItem value="round">
              <AccordionTrigger>How a round works</AccordionTrigger>
              <AccordionContent>
                Set a pretend bet, deal, then hit, stand, or double-ish. Closest to 21 without going over wins.
                The dealer stands on 17 and insists that is the whole story.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="credits">
              <AccordionTrigger>House credits</AccordionTrigger>
              <AccordionContent>
                Credits are fictional, valueless, and non-transferable. There is nothing to buy, win, deposit,
                or cash out. Losing them still stings, which the house considers a free feature.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="dealer">
              <AccordionTrigger>The dealer</AccordionTrigger>
              <AccordionContent>
                From time to time the dealer produces the single exact card required to beat you. The table
                has reviewed this behavior and found it statistically fascinating. Suspicion levels are tracked
                for decorative purposes only.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>

      <CommandMenu actions={commands} placeholder="Deal, hit, stand, or investigate…" />
      <Toasts position="bottom-center" />
    </div>
  )
}

export default function App() {
  return (
    <SoundEffects>
      <TableInner />
    </SoundEffects>
  )
}
