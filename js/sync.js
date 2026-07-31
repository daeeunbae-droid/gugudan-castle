/* =========================================================
   sync.js — 기기 간 이어하기 (선택 기능)

   설정 안 하면 아무것도 하지 않습니다. 게임은 그대로 돌아갑니다.
   설정하려면 아래 FIREBASE_CONFIG 를 채우세요.

   동작 방식
     · 저장은 항상 기기에 먼저. 인터넷이 없어도 게임이 됩니다.
     · "가족 코드"를 입력한 기기끼리만 진행 상황을 주고받습니다.
     · 로그인·이메일·아이 개인정보를 전혀 받지 않습니다.
========================================================= */

const FIREBASE_CONFIG = null;
/*  예시 — Firebase 콘솔에서 복사한 값을 넣으세요.
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "gugudan-castle.firebaseapp.com",
  projectId: "gugudan-castle",
  storageBucket: "gugudan-castle.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
*/

const Sync = {
  ready:false, db:null, uid:null,

  async init(){
    if(!FIREBASE_CONFIG) return false;
    try{
      const [{initializeApp}, auth, fs] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      const a = auth.getAuth(app);
      await auth.signInAnonymously(a);
      this.uid = a.currentUser.uid;
      this.db = fs.getFirestore(app);
      this.fs = fs;
      this.ready = true;
      return true;
    }catch(e){
      console.warn('클라우드 연결 실패 — 기기 저장만 사용합니다', e);
      return false;
    }
  },

  /* 클라우드에서 받아오기. 기기 것보다 새로우면 그걸 씁니다. */
  async pull(code){
    if(!this.ready || !code) return null;
    try{
      const ref = this.fs.doc(this.db, 'saves', code);
      const snap = await this.fs.getDoc(ref);
      if(!snap.exists()) return null;
      const remote = snap.data();
      const local = Save.s;
      if((remote.updatedAt||0) > (local.updatedAt||0)) return remote;
      return null;
    }catch(e){ console.warn('불러오기 실패', e); return null; }
  },

  /* 올리기 (자동 저장 뒤 2.5초 후 호출됨) */
  async push(state){
    if(!this.ready || !state.familyCode) return;
    try{
      const ref = this.fs.doc(this.db, 'saves', state.familyCode);
      await this.fs.setDoc(ref, JSON.parse(JSON.stringify(state)));
    }catch(e){ console.warn('올리기 실패', e); }
  },

  /* 가족 코드 만들기 — 헷갈리는 글자(0,O,1,I)는 뺐습니다 */
  makeCode(){
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s=''; for(let i=0;i<6;i++) s+=A[Math.floor(Math.random()*A.length)];
    return s;
  }
};
