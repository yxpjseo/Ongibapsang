import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import styled from "styled-components"; 
import ProgressBar from "./components/ProgressBar";
import BottomBar from "./components/BottomBar";

//Home
import Home from "./pages/home/Home";
//Order
import Case1 from "./pages/case/Case1";
import OrderRequest from './pages/order/OrderRequest';
import OrderCompleted from './pages/order/OderCompleted';
import ExpectedTime from './pages/order/ExpectedTime';
import OrderCancel from './pages/order/OrderCancel';
//initial
import LandingPage from './pages/initial/LandingPage';
import HealthStatus from './pages/initial/HealthStatus';
import FoodRecommendation from './pages/initial/FoodRecommendation';
//Payment
import Payment from './pages/payment/Payment';
//delivery-feedback
import DeliveryCheck from "./pages/delivery-feedback/DeliveryCheck";
import DeliveryComplaint from "./pages/delivery-feedback/DeliveryComplaint";
import EatingChoice from "./pages/delivery-feedback/EatingChoice";
import IssueForwarding from "./pages/delivery-feedback/IssueForwarding";
//food-feedback
import FoodCheck from "./pages/food-feedback/FoodCheck";
import FoodSatisfaction from "./pages/food-feedback/FoodSatisfaction";
import FoodComplaint from "./pages/food-feedback/FoodComplaint";
import FoodForwarding from "./pages/food-feedback/FoodForwarding";
//health-feedback
import HealthCheck from "./pages/health-feedback/HealthCheck";
import FeelingCheck from "./pages/health-feedback/FeelingCheck";
import HealthForwarding from "./pages/health-feedback/HealthForwarding";

export default function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

function MainLayout() {
  const location = useLocation();

  // 끝 슬래시 제거 (예: '/receipt-check/' -> '/receipt-check')
  const pathname = location.pathname.replace(/\/+$/, "") || "/";

  //BottomBar
  const hiddenRoutes = ["/orderrequest"];
  const showBottom = !hiddenRoutes.includes(pathname);

  //TopBar 라우트별 progress 값
  const progressMap = {
    /*home*/
    "/home": { step: 0, total: 0 },
      
    /*order*/
    "/case1": { step: 1, total: 2 },
    "/order-request": { step: 0, total: 0 },
    "/expected-time": { step: 0, total: 0 },
    "/order-cancel": { step: 0, total: 0 },

    /*initial*/
    "/landing-page": { step: 0, total: 0 },
    "/Health-Status": { step: 0, total: 0 },
    "/food-recommendation": { step: 0, total: 0 },

    /*Payment*/
    "/payment": { step: 2, total: 2 },

    /*delivery-feedback*/
    "/delivery-check": { step: 1, total: 2 },
    "/delivery-complaint": { step: 2, total: 2 },
    "/issue-forwarding": { step: 0, total: 0 },
    "/eating-choice": { step: 2, total: 2 },
    /*food-health-feedback*/
    "/food-check": { step: 1, total: 3 },
    "/food-satisfaction": { step: 2, total: 3 },
    "/food-complaint": { step: 2, total: 3 },
    "/food-forwarding": { step: 3, total: 3 },
    "/health-check": { step: 1, total: 3 },
    "/feeling-check": { step: 2, total: 3 },
    "/health-forwarding": { step: 3, total: 3 },
  };

  const progress = progressMap[pathname] || { step: 0, total: 0 };

  return (
    <>
      {/* TopBar는 항상 app-container 밖 */}
      <ProgressBar progress={progress} />

      {/* 콘텐츠 */}
      <main className="app-container">
        <Routes>
          {/* 기본 진입 시 home으로 이동 */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          {/*home*/}
          <Route path="/home" element={<Home />} />
          {/*order*/}
          <Route path="/case1" element={<Case1 />} />
          <Route path="/order-request" element={<OrderRequest />} />
          <Route path="/order-completed" element={<OrderCompleted />} />
          <Route path="/expected-time" element={<ExpectedTime />} />
          <Route path="/order-cancel" element={<OrderCancel />} />
          {/*initial*/}
          <Route path='/landing-page' element={<LandingPage />} />
          <Route path='/health-status' element={<HealthStatus />} />
          <Route path='/food-recommendation' element={<FoodRecommendation />} />
          {/*payment*/}
          <Route path='/payment' element={<Payment />} />
          {/*delivery-feedback*/}
          <Route path="/delivery-check" element={<DeliveryCheck />} />
          <Route path="/delivery-complaint" element={<DeliveryComplaint />} />
          <Route path="/issue-forwarding" element={<IssueForwarding />} />
          <Route path="/eating-choice" element={<EatingChoice />} />
          {/*food-feedback*/}
          <Route path="/food-check" element={<FoodCheck />} />
          <Route path="/food-satisfaction" element={<FoodSatisfaction />} />
          <Route path="/food-complaint" element={<FoodComplaint />} />
          <Route path="/food-forwarding" element={<FoodForwarding />} />
          {/*health-feedback*/}
          <Route path="/health-check" element={<HealthCheck />} />
          <Route path="/feeling-check" element={<FeelingCheck />} />
          <Route path="/health-forwarding" element={<HealthForwarding />} />
        </Routes>
      </main>

      {/* BottomBar는 항상 app-container 밖 */}
      {showBottom && <BottomBar />}
    </>
  );
}