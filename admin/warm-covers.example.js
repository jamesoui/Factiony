/**
 * Script admin pour rafraîchir le cache des jaquettes Top 50
 *
 * Usage:
 * 1. Copier ce fichier vers admin/warm-covers.js
 * 2. S'assurer que les variables d'environnement sont configurées dans .env
 * 3. Exécuter: node admin/warm-covers.js
 *
 * Variables requises:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - WARM_TOP_COVERS_SECRET (à configurer dans Supabase Edge Functions Secrets)
 */

// Charger les variables d'environnement
// Pour Node.js: installer dotenv avec `npm install dotenv`
// require('dotenv').config();

// Pour Deno ou environnement moderne:
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const WARM_SECRET = process.env.WARM_TOP_COVERS_SECRET;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !WARM_SECRET) {
  console.error('❌ Variables d\'environnement manquantes:');
  if (!SUPABASE_URL) console.error('  - VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) console.error('  - VITE_SUPABASE_ANON_KEY');
  if (!WARM_SECRET) console.error('  - WARM_TOP_COVERS_SECRET');
  process.exit(1);
}

/**
 * Rafraîchir le cache des jaquettes
 * @param {boolean} force - Si true, force la mise à jour même si cache valide
 * @param {number} limit - Nombre de jeux à traiter
 * @returns {Promise<Object>} Résultat de l'opération
 */
async function warmCovers(force = false, limit = 75) {
  console.log(`🚀 Lancement du rafraîchissement du cache...`);
  console.log(`   Force: ${force}`);
  console.log(`   Limit: ${limit}`);
  console.log('');

  const startTime = Date.now();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/warm-top-game-covers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'X-Warm-Secret': WARM_SECRET
        },
        body: JSON.stringify({ force, limit })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Rafraîchissement terminé!');
    console.log('');
    console.log('📊 Résultats:');
    console.log(`   Total: ${result.total}`);
    console.log(`   Traités: ${result.processed}`);
    console.log(`   ✅ Mis à jour: ${result.updated}`);
    console.log(`   💾 Déjà en cache: ${result.cached}`);
    console.log(`   ❌ Échecs: ${result.failed}`);
    console.log('');
    console.log(`⏱️  Durée: ${duration}s`);

    if (result.failed > 0) {
      console.log('');
      console.log('⚠️  Détails des échecs:');
      result.details
        .filter(d => !d.success)
        .forEach(d => {
          console.log(`   - ${d.slug}: ${d.message}`);
        });
    }

    return result;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('');
    console.error('❌ Erreur lors du rafraîchissement:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error(`⏱️  Durée avant erreur: ${duration}s`);
    throw error;
  }
}

// Arguments de ligne de commande
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 75;

// Afficher l'aide
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node admin/warm-covers.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --force, -f          Force la mise à jour même si cache valide');
  console.log('  --limit=N            Nombre de jeux à traiter (défaut: 75)');
  console.log('  --help, -h           Affiche cette aide');
  console.log('');
  console.log('Exemples:');
  console.log('  node admin/warm-covers.js                    # Met à jour les covers obsolètes');
  console.log('  node admin/warm-covers.js --force            # Force la mise à jour de tout');
  console.log('  node admin/warm-covers.js --limit=50         # Traite seulement 50 jeux');
  console.log('  node admin/warm-covers.js --force --limit=25 # Force 25 jeux');
  process.exit(0);
}

// Exécution
warmCovers(force, limit)
  .then(() => {
    console.log('');
    console.log('🎉 Terminé avec succès!');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('💥 Le script a échoué.');
    process.exit(1);
  });
