import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const PaymentCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Paiement Annulé - Factiony</title>
      </Helmet>
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h1 style={{ color: "red" }}>❌ Paiement annulé</h1>
        <p>Ton abonnement n'a pas été activé.</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "8px", background: "gray", color: "white" }}
        >
          Retour à l'accueil
        </button>
      </div>
    </>
  );
};

export default PaymentCancelPage;
