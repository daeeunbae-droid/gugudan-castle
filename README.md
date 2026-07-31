# 구구단성의 보물 v1.0

## 바로 해보기
`index.html` 을 더블클릭하면 실행됩니다.

## 폴더
```
index.html        화면 구조
manifest.json     홈 화면에 추가용
css/style.css     디자인
js/data.js        ★ 몬스터·아이템·상점·난이도·보상 (밸런스는 여기만 고치면 됩니다)
js/save.js        저장 (기기)
js/sync.js        ★ 기기 간 이어하기 (Firebase 설정 넣는 곳)
js/audio.js       효과음·음악·몬스터 음성
js/core.js        화면 전환·공용
js/map.js         지도·이동·펫
js/train.js       훈련소
js/battle.js      전투·퍼즐방
js/main.js        시작화면·상점·설정
img/              그림 25장
songs/            song-2.mp3 ~ song-9.mp3 (넣으면 자동 재생)
voice/            ask-2-1.mp3 / ans-2-1.mp3 ... (넣으면 TTS 대신 사용)
```

## 자주 고칠 값 — js/data.js
- `DIFF` : 난이도별 제한시간·하트·골드 배율
- `REWARD` : 몬스터당 골드
- `SHOP` : 상점 물건과 가격
- `PET.stages` : 펫이 자라는 데 필요한 정답 수

## 기기 간 이어하기 (선택)
1. Firebase 콘솔에서 새 프로젝트 생성
2. Firestore 데이터베이스 만들기 + Authentication 에서 익명 로그인 켜기
3. 웹 앱 추가 후 설정값을 `js/sync.js` 의 `FIREBASE_CONFIG` 에 붙여넣기
4. 게임 안 ⚙️ 설정에서 "코드 만들기" → 다른 기기에서 "코드 입력"

설정하지 않아도 게임은 그대로 돌아갑니다 (기기에 저장).

## 주의
카카오톡 안에서 열면 진행이 저장되지 않을 수 있습니다.
링크를 연 뒤 "브라우저로 열기" → "홈 화면에 추가" 로 쓰세요.
