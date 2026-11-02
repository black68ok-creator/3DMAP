<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 서버 없이 Nostr로 스팟별 인원수를 공유하면 지도가 살아 있고, 함께 앉으면 더 오래 머무는가? -->
<!-- Date: 2026-11-02 -->
# 멍 지도 — concept prototype

**Status:** in-progress (built, not played)

## Hypothesis
지도에서 따뜻한 불빛(지금 앉아 있는 사람)을 보면 플레이어는 그 스팟으로 들어가고, 혼자일 때보다 함께일 때 더 오래 앉아 있는다.
참으로 판정하는 신호:
- (a) 서로 다른 네트워크의 기기 2대 이상에서 운영 서버 없이 인원수가 90초 안에 반영된다.
- (b) 누군가와 함께 앉은 테스터가 혼자 앉은 테스터보다 2배 이상 오래 머문다 (∞ 타이머).

Riskiest assumption: 공용 Nostr 릴레이만으로 presence가 충분히 빠르고 안정적인가.

## How to run
1. `prototype.html`을 브라우저로 엽니다 (더블클릭). 인터넷 연결 필요 — nostr-tools를 jsDelivr에서, 릴레이는 공용 wss로 연결합니다.
2. 다른 기기/브라우저(가능하면 다른 네트워크, 예: PC 와이파이 + 휴대폰 LTE)에서도 같은 파일을 엽니다.
3. 한쪽에서 스팟을 눌러 앉으면, 다른 쪽 지도에 불빛이 켜지는지 봅니다 (최대 30초 heartbeat + 릴레이 지연).
4. 함께 앉아 소리 레이어를 켜고 끄고, `끄덕`을 눌러 봅니다. `일어나기`를 누르면 지도 하단에 내 기록이 쌓입니다.

화면 아래 로그 창에 릴레이 연결/거부 상태가 표시됩니다.

## What it is
- 지도: 스팟 2개(비 오는 편의점 앞, 새벽 산사), 불빛 수 = 90초 TTL 안의 고유 pubkey 수.
- Presence: Nostr kind 30078 (parameterized replaceable, `d`/`t` 태그 + NIP-40 expiration), 30초 heartbeat, 세션 임시 키.
- 제스처: kind 20078 ephemeral `nod`, 클라이언트 5초 rate-limit.
- 소리: Web Audio 합성 레이어 4개/스팟 (샘플 파일 없음).
- 타이머: wall-clock 기준. 기록: localStorage.

## Verification so far
샌드박스에서는 공용 릴레이·CDN 접속이 네트워크 정책으로 막혀 있어, Playwright로 nostr-tools를 로컬 번들로 대체하고 릴레이 1개를 WebSocket 가로채기(서명 검증 포함)로 흉내 내어 2개 브라우저 컨텍스트에서 확인함:
- B의 지도에 A의 불빛 1개가 표시됨, 같은 스팟에 함께 앉으면 두 자리 모두 불빛 표시.
- 응답하지 않는 릴레이 3곳은 재시도 로그만 남기고 동작에 영향 없음.
- A가 일어나면 기록 1건 저장.
**실제 공용 릴레이에서의 동작(이벤트 kind 수용 여부, 지연, rate-limit)은 아직 검증되지 않았습니다.**

## Findings
(플레이 후 /prototype 디브리프에서 작성)
