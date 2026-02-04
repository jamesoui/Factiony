import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Paiement Réussi - Factiony</title>
      </Helmet>
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h1 style={{ color: "green" }}>🎉 Merci pour ton abonnement Premium !</h1>
        <p>Ton compte a bien été mis à jour.</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: "20px", padding: "10px 20px", borderRadius: "8px", background: "orange", color: "white" }}
        >
          Retour à l'accueil
        </button>
      </div>
    </>
  );
};

export default PaymentSuccessPage;
