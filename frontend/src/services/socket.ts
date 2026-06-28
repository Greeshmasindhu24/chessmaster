import { resolveApiOrigin } from '../config/apiUrl'

export type GameEvent =
  | 'connected'
  | 'matchmaking'
  | 'match_found'
  | 'player_joined'
  | 'move_played'
  | 'timer_update'
  | 'draw_offer'
  | 'game_finished'
  | 'chat_message'
  | 'error'

export interface WsMessage<T = Record<string, unknown>> {
  event: GameEvent
  data: T
}

type EventHandler = (data: Record<string, unknown>) => void

function wsBaseUrl(): string {
  const base = resolveApiOrigin() || window.location.origin
  const url = new URL(base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.origin
}

export class GameSocket {
  private ws: WebSocket | null = null
  private handlers = new Map<GameEvent, Set<EventHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  connect(accessToken: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return

    const url = `${wsBaseUrl()}/api/v1/ws/game?token=${encodeURIComponent(accessToken)}`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        const handlers = this.handlers.get(msg.event)
        handlers?.forEach((h) => h(msg.data))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.ws = null
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  on(event: GameEvent, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return () => this.handlers.get(event)?.delete(handler)
  }

  send(type: string, data: Record<string, unknown> = {}) {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type, data }))
  }

  findMatch(timeControlSeconds: number, incrementSeconds: number) {
    this.send('find_match', {
      time_control_seconds: timeControlSeconds,
      increment_seconds: incrementSeconds,
    })
  }

  cancelMatchmaking(timeControlSeconds: number, incrementSeconds: number) {
    this.send('cancel_matchmaking', {
      time_control_seconds: timeControlSeconds,
      increment_seconds: incrementSeconds,
    })
  }

  joinGame(gameId: string) {
    this.send('join_game', { game_id: gameId })
  }

  playMove(gameId: string, uci: string, timeRemainingMs?: number) {
    this.send('move', { game_id: gameId, uci, time_remaining_ms: timeRemainingMs })
  }

  offerDraw(gameId: string) {
    this.send('draw_offer', { game_id: gameId })
  }

  respondDraw(gameId: string, accepted: boolean) {
    this.send('draw_response', { game_id: gameId, accepted })
  }

  resign(gameId: string) {
    this.send('resign', { game_id: gameId })
  }

  sendChat(gameId: string, text: string) {
    this.send('chat_message', { game_id: gameId, text })
  }

  syncTimer(gameId: string, whiteTimeMs: number, blackTimeMs: number) {
    this.send('timer_sync', {
      game_id: gameId,
      white_time_ms: whiteTimeMs,
      black_time_ms: blackTimeMs,
    })
  }
}

export const gameSocket = new GameSocket()
