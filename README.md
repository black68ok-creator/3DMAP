# 별빛 캠핑장

모닥불, 텐트, 호수가 있는 밤 숲 3D 캠핑장입니다. 같은 주소를 연 사람들끼리 실시간으로 함께 걷고, 말하고, 마시멜로를 구워요.

## 조작

| 키 | 동작 |
| --- | --- |
| WASD / 방향키 | 이동 (Shift 달리기) |
| 마우스 드래그 / 휠 | 시점 회전 / 줌 |
| Enter | 말하기 |
| Q | 손 흔들기 |
| Space | 점프 |
| E | 통나무에 앉기 |
| F | 마시멜로 꺼내기·먹기 (불 가까이에서 익어요) |

모바일에서는 왼쪽 아래 조이스틱으로 움직입니다.

## 멀티플레이

서버가 없습니다. [Trystero](https://github.com/dmotz/trystero)로 브라우저끼리 WebRTC로 직접 연결하고, 처음 서로를 찾을 때만 공개 Nostr 릴레이를 씁니다.

- 기본 방은 `campfire`입니다. 주소 끝에 `#우리방`처럼 해시를 붙이면 그 이름의 별도 방에 들어갑니다(영문·숫자·하이픈만).
- 회사망 등 일부 네트워크(대칭형 NAT, WebRTC 차단)에서는 서로 연결되지 않을 수 있습니다.
- 위치와 대화는 저장되지 않습니다.

## 배포 (GitHub Pages)

Settings → Pages → Source: **Deploy from a branch**, Branch: `main` / `(root)`.

## 구성

- `index.html` — 페이지 전체(Three.js 장면, UI, 멀티플레이 어댑터)
- `vendor/three.min.js` — three.js r128 (MIT, `vendor/THREE-LICENSE`)
- `vendor/trystero-nostr.js` — trystero 0.25.4 nostr 번들 (MIT, `vendor/TRYSTERO-LICENSE`)
