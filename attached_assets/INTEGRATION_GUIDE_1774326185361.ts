/**
 * ─────────────────────────────────────────────────────────
 * PageAccess.tsx 수정 가이드
 * 경로: /client/src/pages/PageAccess.tsx (또는 유사한 경로)
 *
 * 아래 diff를 참고하여 기존 PageAccess 컴포넌트에
 * Menu Allocation 탭을 추가하세요.
 * ─────────────────────────────────────────────────────────
 *
 * [1] import 추가 (파일 상단)
 */
import MenuAllocationTab from '../components/MenuAllocationTab';

/**
 * [2] 탭 상태 추가 (컴포넌트 내부)
 */
const [activeTab, setActiveTab] = useState<'access' | 'allocation'>('access');

/**
 * [3] 탭 UI — 기존 페이지 헤더 아래에 삽입
 *
 * <div style={{ display:'flex', borderBottom:'1px solid #E8E6E2', marginBottom:24 }}>
 *
 *   <button
 *     onClick={() => setActiveTab('access')}
 *     style={{
 *       padding:'10px 20px', fontSize:13, fontWeight:500, cursor:'pointer',
 *       background:'none', border:'none',
 *       color: activeTab==='access' ? '#F5821F' : '#57534E',
 *       borderBottom: activeTab==='access' ? '2px solid #F5821F' : '2px solid transparent',
 *       marginBottom:-1, display:'flex', alignItems:'center', gap:6,
 *     }}
 *   >
 *     🔒 Access Control
 *   </button>
 *
 *   <button
 *     onClick={() => setActiveTab('allocation')}
 *     style={{
 *       padding:'10px 20px', fontSize:13, fontWeight:500, cursor:'pointer',
 *       background:'none', border:'none',
 *       color: activeTab==='allocation' ? '#F5821F' : '#57534E',
 *       borderBottom: activeTab==='allocation' ? '2px solid #F5821F' : '2px solid transparent',
 *       marginBottom:-1, display:'flex', alignItems:'center', gap:6,
 *     }}
 *   >
 *     ☰ Menu Allocation
 *   </button>
 *
 * </div>
 *
 * [4] 탭 콘텐츠 — 기존 Access Control 테이블을 조건부 표시로 감싸기
 *
 * {activeTab === 'access' && (
 *   // 기존 Access Control 테이블 JSX 그대로 유지
 *   <existing access control table />
 * )}
 *
 * {activeTab === 'allocation' && (
 *   <MenuAllocationTab />
 * )}
 */

// ─────────────────────────────────────────────────────────
// server/src/index.ts (또는 app.ts) 에 라우트 등록
// ─────────────────────────────────────────────────────────

/**
 * import menuAllocationRoutes from './routes/menuAllocationRoutes';
 *
 * // 기존 라우트 등록 블록 근처에 추가:
 * app.use('/api/menu-allocation', menuAllocationRoutes);
 */

export {};
