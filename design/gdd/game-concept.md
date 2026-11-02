# Game Concept: 멍 지도 (Meong Map)

*Created: 2026-11-02*
*Status: Draft*

---

## Elevator Pitch

> 비 오는 편의점 앞, 새벽 산사 같은 "우리 동네 멍 스팟"을 골라 들어가, 지금 그 자리에 앉아 있는 낯선 사람들과 말 없이 함께 소리를 들으며 멍때리는 웹 ASMR 명상 게임.

10초 테스트: "지도에서 자리 고르고 → 앉아서 → 소리 들으며 멍때린다. 옆에 사람이 있다." 로 전달된다.

---

## Core Identity

| Aspect | Detail |
| ---- | ---- |
| **Genre** | 앰비언트 / ASMR 명상 + 비동기·동기 소셜 공존(co-presence) |
| **Platform** | Web / Browser (모바일 브라우저 1순위, PC 브라우저 지원). 링크로 바로 입장 |
| **Target Audience** | 아래 Target Player Profile 참조 — 대화 없는 사람 온기를 원하는 20–30대 |
| **Player Count** | 온라인 멀티플레이 (스팟당 6–8석, 넘치면 인스턴스 분할) |
| **Session Length** | 10–60분 (멍 타이머 5/10/25/∞) |
| **Monetization** | 없음 (무료, 광고 없음). 운영비 0원 구조라 수익이 생존 조건이 아님 |
| **Estimated Scope** | Medium (6–9 months, solo + AI 보조) — MVP 8–10주 |
| **Comparable Titles** | Sky: Children of the Light, Kind Words, Lofi Girl 스트림 / 불멍 유튜브 |

---

## Core Fantasy

**"동네의 조용한 자리를 다 아는 단골. 혼자 왔지만, 혼자가 아니다."**

퇴근길에 들르는 비 오는 편의점 처마 밑, 해 뜨기 전 산사의 툇마루. 그 자리에 가면 늘 그 소리가 있고, 오늘도 누군가 조용히 앉아 있다. 말을 걸 필요도, 무언가를 해낼 필요도 없다. 자주 오면 그 자리가 나를 기억한다(내 앉은 시간, 내가 남긴 흔적).

다른 앱에서 못 하는 것: ASMR 영상·앱은 혼자 듣고, 소셜 게임은 무언가를 하라고 한다. 여기는 **"아무것도 안 하면서 누군가와 함께 있는"** 것이 가능한 유일한 장소.

---

## Unique Hook

**"ASMR 플레이리스트 같지만, 그 자리마다 '지금' 누가 앉아 있다."**

- 지도 위 각 스팟에 지금 앉아 있는 사람 수만큼 따뜻한 불빛이 켜진다 (대략치: "불빛 n개").
- 아무도 없는 스팟에도 지난 방문자의 흔적(데워진 자리, 놓고 간 컵, 남은 김)이 남아 있어 빈 방이 외롭지 않다.
- 이 훅은 P2(말 없는 함께) × P3(우리 동네 그 자리)의 결합을 눈에 보이게 만드는 장치이며, 차별화의 핵심이다. 서버 없이 구현 가능함을 TD-FEASIBILITY가 확인했다(best-effort, 보존 비보장 — Technical Risks 참조).

---

## Player Experience Analysis (MDA Framework)

### Target Aesthetics (What the player FEELS)

| Aesthetic | Priority | How We Deliver It |
| ---- | ---- | ---- |
| **Submission** (relaxation, comfort zone) | 1 | 입력 없이 유지되는 경험, 느린 카메라 드리프트, 실패 없는 타이머 |
| **Sensation** (sensory pleasure) | 2 | 장소 고유의 레이어드 사운드(처마 낙수, 냉장고 웅웅, 목탁), 수채 디오라마 |
| **Fellowship** (social connection) | 3 | 함께 앉은 사람의 불빛·실루엣, 드문 제스처(끄덕, 손 흔들기, 차 건네기), 흔적 |
| **Discovery** (exploration, secrets) | 4 | 새 스팟·시간대·날씨 변형 발견, "지금 산사에 2명" 같은 시간대별 지도 변화 |
| **Fantasy** (make-believe) | 5 | 동네 단골이라는 정체성 |
| **Expression** | 6 | 소리 레이어 조합을 내 취향대로 |
| **Narrative** | N/A | 서사 없음 (장소 자체가 이야기) |
| **Challenge** | N/A | 의도적으로 배제 (Anti-pillar) |

### Key Dynamics (Emergent player behaviors)

- 플레이어가 "나만의 자리"를 정하고 같은 시간대에 반복 방문한다 (단골화).
- 지도를 열어 불빛이 켜진 스팟으로 자연스럽게 모인다 (인원 집중 → 빈 방 완화).
- 말 대신 "끄덕" 하나로 인사하는 무언의 예절이 생긴다.
- 공부·작업·잠들기 전 배경으로 ∞ 타이머를 켜 두고 오래 머문다.
- 스크린샷과 "오늘 비 오는 편의점에서 3명이랑 멍" 같은 공유가 SNS에서 일어난다.

### Core Mechanics (Systems we build)

1. **멍 지도 + 스팟별 실시간 인원(presence)** — Nostr event 기반 heartbeat, TTL 집계, 대략치 표시
2. **장소 사운드 레이어 믹서** — 스팟마다 고유 레이어 4–6개, 부드러운 크로스페이드, 개인별 on/off·볼륨
3. **앉기 + 멍 타이머 + 앉은 시간 도장** — 실패 없음, 벽시계(wall-clock) 기준 계측, 로컬 기록
4. **비언어 제스처** — 끄덕/손 흔들기/차 건네기, 클라이언트 rate-limit, 개인 mute
5. **방문자 흔적** — 자유 텍스트 없는 구조화 enum event (좌석·앉은 시간 구간·제스처·레이어 조합)

---

## Player Motivation Profile

### Primary Psychological Needs Served

| Need | How This Game Satisfies It | Strength |
| ---- | ---- | ---- |
| **Autonomy** | 어디에 앉을지, 어떤 소리를 들을지, 얼마나 머물지 전부 내가 정한다. 게임은 아무것도 요청하지 않는다 | Core |
| **Competence** | 누적 앉은 시간, 도장, 자주 간 자리 — 숙련이 아니라 "쌓임"의 감각. 의도적으로 약하게 둔다 | Minimal |
| **Relatedness** | 대화 없이 곁에 있음. 불빛·실루엣·제스처·흔적으로 "누군가 있다"를 느낀다 | Core |

### Player Type Appeal (Bartle Taxonomy)

- [ ] **Achievers** — 도장 수집이 약하게 존재하지만 주 대상 아님. 수집욕을 자극하지 않도록 설계
- [x] **Explorers** — 새 스팟, 시간대·날씨 변형, 지도의 변화하는 불빛
- [x] **Socializers** — 단, "조용한 Socializer": 관계보다 공존(co-presence)을 원하는 사람
- [ ] **Killers/Competitors** — 명시적 배제

Quantic Foundry 기준 주 동기: Immersion(Fantasy), Social(Community, 낮은 강도), Creativity(Discovery).

### Flow State Design

- **Onboarding curve**: 첫 화면은 지도 하나. "불빛이 있는 곳을 눌러 보세요" 한 줄. 스팟에 들어가 "앉기"를 탭하면(오디오 잠금 해제 겸) UI가 사라진다. 설명서 없이 60초 안에 멍 상태 도달.
- **Difficulty scaling**: 해당 없음. 대신 "깊이"가 늘어난다 — 레이어 조합, 시간대 변형, ∞ 타이머.
- **Feedback clarity**: 소리 크로스페이드, 화면의 미세한 호흡, 타이머 끝 종소리, 도장. 성취가 아니라 "머물렀다"는 확인.
- **Recovery from failure**: 실패가 존재하지 않는다. 중간에 나가도 앉은 시간만큼 기록된다.

---

## Core Loop

### Moment-to-Moment (30 seconds)
자리에 앉는다 → 소리 레이어 1–2개를 켜거나 끈다(빗소리 세기, 냉장고 웅웅, 목탁) → 시선이 정해진 곳(비 맺힌 유리, 촛불, 강물)으로 천천히 내려앉는다. 아무 입력이 없어도 경험은 계속된다. 피드백은 소리의 부드러운 크로스페이드와 화면의 미세한 호흡뿐. 이 루프 자체의 만족은 "소리의 질"과 "곁에 있는 불빛"에서 온다.

### Short-Term (5-15 minutes)
멍 타이머(5/10/25/∞) 한 바퀴. 끝나면 은은한 종소리와 **멍 도장**: "새벽 산사 · 12분 · 3명과 함께". 타이머 도중 나가도 실패가 아니며 앉은 시간만큼 기록. 가끔 옆 사람이 끄덕이면 끄덕여 줄 수 있다(무응답도 정상).

### Session-Level (30-120 minutes)
지도 → 스팟 1–3곳 → 마지막에 비공개 "오늘의 멍 한 줄"(선택, 내 기기에만 저장). 자연스러운 종료점: 타이머 종소리. 다음 방문 이유: 시간대마다 달라지는 지도("지금 새벽 산사에 2명"), 내 단골 자리.

### Long-Term Progression
- 스팟 도장 모음 (실패 개념 없음, 앉은 시간 누적)
- 같은 스팟의 시간대·날씨 변형 해금 (눈 오는 편의점, 장마철 한강)
- "그 자리가 나를 기억한다": 자주 간 자리의 미세한 변화 (내 컵 자리, 내 흔적)
- 끝이 없다. 목표는 "다 모으기"가 아니라 "단골 되기".

### Retention Hooks
- **Curiosity**: 아직 안 가 본 스팟, 다른 시간대의 같은 장소
- **Investment**: 누적 앉은 시간, 내 자리, 비공개 멍 일기 (로컬 + 백업 코드로 보호)
- **Social**: 지도에 켜진 불빛 — "지금 누가 있다"
- **Mastery**: 해당 없음 (의도적)

---

## Game Pillars

### Pillar 1: 아무것도 안 해도 된다
가만히 있는 것이 정답인 게임. 경험을 *유지*하는 데 입력이 필요해서는 안 되고, 게임이 먼저 입력을 *요청*하지 않는다. 입력은 언제나 선택이다.

*Design test*: "입력하지 않으면 무언가를 잃는가?" → 잃는다면 그 설계는 기각. (예: 타이머 끝 "계속하기" 버튼 강제 → 기각. 도장은 끝까지 안 채워도 앉은 시간만큼 기록 → 채택.)

### Pillar 2: 말 없는 함께
대화하지 않아도 곁에 있음이 느껴진다. 제스처는 저빈도·무응답이 기본값이며, 응답하지 않아도 무례가 아니다.

*Design test*: 텍스트 채팅 vs 비언어 제스처 → 제스처. 멍 일기 공개 vs 비공개 → 비공개. 음성 채팅 → 제거.

### Pillar 3: 우리 동네 그 자리
판타지가 아니라 어디선가 본 듯한 한국의 장소. 판정 질문: "한국에 사는 사람이 보자마자 '아, 이런 데 있지'라고 하는가? 관광 명소가 아니라 지나쳐 본 자리인가?" 실존 브랜드·상표는 쓰지 않고 그 느낌만 가져온다.

*Design test*: 멋진 가상 장소 vs 있을 법한 동네 구석 → 동네 구석. (새벽 산사는 경계 사례: 관광 사찰이 아닌 동네 뒷산 작은 절로 해석.)

### Pillar 4: 그 자리의 소리가 주인공
화면은 소리를 위한 액자이고, 소리는 범용이 아니라 장소 고유의 것이다 — 편의점 처마 위로 떨어지는 비, 목욕탕 타일에 울리는 물소리. 비주얼의 역할은 "시선이 내려앉을 곳".

*Design test*: 그래픽 디테일 vs 장소 고유 사운드 레이어 → 사운드. 범용 빗소리 vs 그 자리의 빗소리 → 그 자리의 빗소리.

### Pillar 5: 그 자리는 언제 와도 그대로 있다
서비스 종료가 없고, 계정 없이도 내 기록이 남는다. 단골이 돌아왔을 때 그 자리와 내 흔적이 그대로 있다는 약속.

*Design test*: 운영자가 관리해야 하는 기능 vs 누구 없이도 계속 도는 기능 → 계속 도는 쪽. 기록을 서버에 vs 내 기기 + 백업 코드 → 내 기기 + 백업 코드.

> **기술 제약 (기둥 아님, ADR로 기록 예정)**: 우리가 운영하는 서버 없음, 운영비 0원. 공용 Nostr relay·STUN은 제3자 의존이며 Technical Risks에 기록.

### Anti-Pillars (What This Game Is NOT)

- **NOT 랭킹·경쟁·점수**: P1(아무것도 안 해도 된다)을 무너뜨린다.
- **NOT 연속 출석 압박·푸시 알림**: 쉬러 왔는데 의무가 생긴다 (P1).
- **NOT 공개 텍스트 채팅·음성 채팅**: P2(말 없는 함께)와 충돌하고, 서버 없이는 신고·차단 모더레이션이 불가능하다.
- **NOT 계정·로그인·결제벽·광고**: P5와 운영비 0원 제약을 깬다.
- **NOT 실존 브랜드 재현**: P3는 "그 느낌"이지 상표가 아니다.

---

## Visual Identity Anchor

**방향: 수채 동네 모형 (Watercolor Diorama) + "따뜻한 한 점 = 사람 있음" 조명 규칙** (AD-CONCEPT-VISUAL 방향 B + A 조명 규칙 하이브리드)

**한 줄 규칙**: "모든 스팟은 손바닥만 한 종이 모형이고, 그 안의 빛과 소리만 살아 있다. 따뜻한 한 점의 빛은 언제나 '누군가 여기 있다'는 뜻이다."

**보조 원칙**

1. **단순화하되 식별은 지킨다** — 디테일은 지우고 실루엣·비율로 "아, 그 편의점"이 읽히게. 간판 서체 느낌, 진열대 색, 타일 패턴 같은 한국 동네 식별 디테일은 반드시 남긴다.
   *Design test*: 디테일 하나를 지울지 고민될 때 → 그것이 "한국 동네"를 식별하게 하는가? 그렇다면 남긴다.
2. **따뜻한 빛은 사람에게만** — 차가운 저채도 장면 속 따뜻한 한 점(형광등 아래 앉은 자리, 사찰 등, 목욕탕 유리창)은 사람(현재 접속자 또는 흔적)의 신호. 장식용 따뜻한 조명은 쓰지 않는다.
   *Design test*: 따뜻한 광원을 추가하려 할 때 → 그것이 사람을 가리키는가? 아니라면 차갑게.
3. **움직임은 호흡 속도로** — 비, 김, 깜빡이는 간판, 느린 카메라 드리프트만. 빠른 움직임·반짝임 금지.
   *Design test*: 애니메이션 속도가 고민될 때 → 사람의 느린 호흡(약 4–6초 주기)보다 빠른가? 그렇다면 늦춘다.

**아바타**: 표정 없는 둥근 인형. 제스처는 몸 기울임·손 흔들기·고개 끄덕임 같은 큰 실루엣 동작으로 읽힌다.

**색 철학**: 저채도, 좁은 명도 폭. 스팟마다 지배색 하나 — 편의점(비에 젖은 청회색 + 형광 연두), 산사(안개 녹회색 + 먹색), 목욕탕(타일 민트 + 김의 미색), 한강(노을 직전 분홍 회색). 색은 "시간대 + 온도"를 말하며 경고·보상을 뜻하지 않는다 (빨강 알림 없음). 인원이 늘면 채도가 아주 조금 오르고, 빈 스팟의 흔적은 종이에 남은 물자국 톤.

**지도 화면**: 모형 상자들을 늘어놓은 선반/지도판. 각 상자의 따뜻한 불빛 개수 = 대략적인 현재 인원.

---

## Inspiration and References

| Reference | What We Take From It | What We Do Differently | Why It Matters |
| ---- | ---- | ---- | ---- |
| Sky: Children of the Light / Journey | 말 없는 동행, 제스처 소통, 낯선 사람의 온기 | 모험·목표 없이 "앉아만 있기", 웹 링크 즉시 입장 | 비언어 소셜이 감정적으로 통한다는 검증 |
| Kind Words | 낯선 사람 간의 다정함, 저자극 소셜 | 텍스트 없음, 실시간 공존 | 조용한 소셜의 수요 검증 |
| Lofi Girl 스트림 / 불멍·물멍 유튜브 | 고정 화면 + 앰비언트 사운드의 몰입, 채팅창 속 "같이 있음" | 장소를 고르고, 소리를 섞고, 옆 사람이 실제로 보인다 | 거대한 "멍" 시청 수요 검증 |
| Noisli / myNoise | 사운드 레이어 믹싱 UX | 범용 소리가 아니라 장소 고유의 소리 (P4) | 레이어 믹서의 사용성 레퍼런스 |
| Focusmate / study-with-me | 함께 있으면 더 오래 머문다 | 의무·약속 없음 | 공존이 체류 시간을 늘린다는 근거 |

**Non-game inspirations**: 한국의 "불멍·물멍·비멍" 문화, 장마철 처마 밑, 동네 목욕탕의 울림, 새벽 예불 목탁 소리, 디오라마·미니어처 사진, 수채 일러스트 그림책.

---

## Target Player Profile

| Attribute | Detail |
| ---- | ---- |
| **Age range** | 20–39 (주 대상), 10대 후반 수험생 포함 |
| **Gaming experience** | Casual — 게임을 거의 안 하는 사람도 포함 |
| **Time availability** | 퇴근 후·잠들기 전 10–30분, 공부·작업 중 배경으로 1시간 이상 |
| **Platform preference** | 스마트폰 브라우저 (링크 공유로 유입), PC 브라우저 (작업 중 배경) |
| **Current games they play** | Sky, 모바일 힐링 게임, 그리고 게임보다는 ASMR·불멍 유튜브, 수면 앱 |
| **What they're looking for** | 대화 부담 없는 사람 온기, 아무것도 안 해도 되는 시간, 익숙한 동네 감성 |
| **What would turn them away** | 회원가입, 광고, 알림, 경쟁, 낯선 사람의 말 걸기, 무거운 로딩 |

---

## Technical Considerations

| Consideration | Assessment |
| ---- | ---- |
| **Recommended Engine** | 미정 — 사용자가 `/setup-engine`으로 결정 예정. TD-FEASIBILITY는 웹(모바일 브라우저) 1순위 + Nostr JS 생태계 의존 때문에 three.js 유지를 강하게 권고 (Godot web export는 wasm 크기, GitHub Pages의 COOP/COEP 미지원, iOS Safari 호환성 문제). |
| **Key Technical Challenges** | 서버 없는 presence·흔적(Nostr event), iOS Safari 백그라운드/화면 꺼짐 시 Web Audio 정지, 모바일 수채 post-process fill-rate, 로컬 기록 소실(ITP 7일) |
| **Art Style** | 3D stylized (저폴리 수채 디오라마) |
| **Art Pipeline Complexity** | Medium — 셰이더 중심(수채 post-process, 종이 텍스처) + 단순 프리미티브 모델링, 스팟당 모델링 예산 ≤ 5일 |
| **Audio Needs** | Adaptive / 레이어드 — 사운드가 주인공. 합성(Web Audio) + CC0 필드 레코딩 짧은 루프(≤30초) |
| **Networking** | 서버리스 — Nostr event(presence heartbeat, 제스처, 흔적)를 공용 relay 3–5개에 중복 발행. WebRTC·음성 채팅 제거 |
| **Content Volume** | MVP: 스팟 2개 × 레이어 4–6개, 제스처 3종. Full: 스팟 8개 이상 × 시간대·날씨 변형 |
| **Procedural Systems** | 합성 앰비언트 사운드, 날씨·시간대 파라미터, 일부 절차 지오메트리 |

---

## Risks and Open Questions

### Design Risks
- "아무것도 안 하는" 게임의 재방문 동기가 약할 수 있다 — 단골 판타지(P5)와 시간대별 지도 변화로 대응, 플레이테스트로 검증.
- 동접이 적으면 대부분의 스팟이 비어 콘셉트가 무너진다(콜드 스타트) — 스팟 수를 적게 시작, 흔적으로 빈 방 완화. 흔적이 0개인 상태도 정상 상태로 디자인. 연출용 가짜 흔적 사용 여부는 정직성 문제로 creative-director 결정 사항.
- 도장·해금이 은근한 목표 압박이 될 수 있다 — 실패 없음, 앉은 시간만큼 기록으로 P1 준수.
- 제스처 스팸·괴롭힘 — 클라이언트 token bucket rate-limit, 개인 mute(세션 단위).

### Technical Risks
- **(TD-FEASIBILITY: CONCERNS — blocker 없음)**
- 스팟별 인원수는 서버 없이 가능하나 best-effort 대략치: Nostr parameterized replaceable event + NIP-40 expiration + 클라이언트 TTL 필터. ghost(TTL 동안 잔존), 위조 가능, relay rate-limit → UI는 "불빛 n개/약 n명".
- 흔적은 서버 없이 가능하나 보존 비보장: 무료 relay가 오래된 event를 삭제하거나 모르는 kind를 거부할 수 있음. 자유 텍스트 금지, enum schema 검증, pubkey별 상한.
- iOS Safari에서 화면 꺼짐/백그라운드 시 Web Audio 정지 — ∞ 타이머 경험에 영향. Wake Lock, MediaStreamDestination→`<audio>`, Media Session, `navigator.audioSession` 기기 검증 필요.
- three.js light 개수 변화 시 셰이더 재컴파일 hitch — 좌석 수만큼 고정 light pool, intensity만 조절.
- 수채 post-process 모바일 fill-rate — dynamic resolution.
- 로컬 기록 소실(iOS ITP 7일) — `navigator.storage.persist()`, PWA 설치 유도, 백업 코드.
- 공용 Nostr relay 의존(생멸, PoW/AUTH 요구) — relay 목록 config화, 3–5개 중복 발행, health check fallback.

### Market Risks
- 무료 ASMR·불멍 유튜브와 경쟁 — 차별점은 "장소를 고르고 옆 사람이 보인다". 스크린샷·링크 공유로 유입.
- 수익화 없음 — 운영비 0원이라 생존에는 문제없으나 지속 개발 동력은 개인 의지에 의존.

### Scope Risks
- **(PR-SCOPE: OPTIMISTIC)** 초안의 MVP 4–6주는 낙관치에도 못 미침 (예상 약 54일 ≈ 11주). → 사용자 결정으로 MVP를 8–10주로 연장, 범위 유지.
- 사실풍 기존 에셋은 수채 스타일에서 재사용 불가 → 아트 범위를 셰이더 중심으로 제한.
- rigor `full` 문서 부담 약 7일 — 구현과 병행 가정 금지, 일정에 명시.
- 멀티플레이 vertical slice는 혼자 검증 불가 — 3–5명 동시 접속 플레이테스트 2회 사전 확보.
- 가장 위험한 중단 지점: presence 미완성 → 1–2주 차 critical path 맨 앞에 배치.

### Open Questions
- 엔진: three.js 유지 vs 전환 → `/setup-engine`에서 결정 (TD 권고: three.js).
- 지도 인원수가 서로 다른 통신사 휴대폰 3대에서 90초 이내 반영되는가? → presence spike (2–3일 time-box, 1–2주 차).
- 하루 지난 흔적이 relay 3개 중 2개 이상에서 조회되는가? → 흔적 spike (1–2일 time-box, MVP 기간 중).
- iOS Safari에서 화면을 끄고도 소리가 이어지는가? → 오디오 spike, 결과에 따라 ∞ 타이머 경험 재정의.
- 기록 이동용 백업 코드를 언제 넣을까? → 기본 Full Vision, 초기 소실 피드백이 있으면 Expansion으로 당김.
- 빈 스팟에 연출용 흔적을 둘 것인가? → creative-director 결정.

---

## MVP Definition

**Core hypothesis**: "낯선 사람들이 말 없이 같은 동네 자리에 함께 앉아 장소 고유의 소리를 듣는 경험이, 혼자 ASMR을 듣는 것보다 더 오래 머물고 다시 오게 만든다."

**Required for MVP**:
1. 지도 화면 + 스팟별 대략 인원수(Nostr presence)
2. 스팟 2개: 비 오는 편의점 앞, 새벽 산사 (수채 디오라마 스타일)
3. 스팟마다 장소 고유 사운드 레이어 4–6개 + 레이어 믹서
4. 앉기 + 멍 타이머(5/10/25/∞) + 앉은 시간 도장(실패 없음) + 로컬 기록
5. 비언어 제스처 3종(끄덕, 손 흔들기, 차 건네기) + rate-limit + 개인 mute
6. 방문자 흔적 기술 spike (기능 출시는 Expansion)

**Explicitly NOT in MVP** (defer to later):
- 방문자 흔적 기능 출시 (spike만 MVP)
- 시간대·날씨 변형
- 스팟 3번째 이후
- 기록 백업 코드
- 음성 채팅 (영구 제거)

### Scope Tiers (if budget/time shrinks)

| Tier | Content | Features | Timeline |
| ---- | ---- | ---- | ---- |
| **MVP** | 스팟 2개 | 지도·presence, 레이어 믹서, 타이머·도장, 제스처 3종, 흔적 spike | 8–10주 |
| **Vertical Slice** | 스팟 2개 완성도 상향 | MVP + 흔적 기능 + 3–5명 플레이테스트 2회 | +2–3주 |
| **Alpha (Expansion)** | 스팟 4개, 시간대 변형 | 흔적, 인스턴스 분할, PWA | 누적 약 3–4개월 |
| **Full Vision** | 스팟 8개 이상, 계절·날씨 변형 | 백업 코드, "자리가 나를 기억한다" | 누적 6–9개월 |

중단 시 fallback: 두 번째 스팟 아트 도중 멈추면 "지도 + 스팟 1개"로 출시 가능(graceful). presence 미완성으로 멈추면 제품이 깨지므로 presence를 맨 앞에 둔다.

---

## Next Steps

- [ ] Get concept approval from creative-director
- [ ] Fill in CLAUDE.md technology stack based on engine choice (`/setup-engine`)
- [ ] Create art bible (`/art-bible`) — Visual Identity Anchor 기반
- [ ] Validate concept (`/design-review design/gdd/game-concept.md`)
- [ ] **Prototype core idea** (`/prototype` presence + 사운드 레이어) — before writing GDDs
- [ ] If prototype PROCEEDS: Decompose concept into systems (`/map-systems`)
- [ ] Design each system (`/design-system [system-name]`)
- [ ] Build vertical slice in Pre-Production (`/vertical-slice`)
- [ ] Validate core loop with playtest (`/playtest-report`)
- [ ] Plan first milestone (`/sprint-plan new`)
