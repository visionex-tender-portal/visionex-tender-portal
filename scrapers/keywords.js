/**
 * Shared keyword definitions for construction tender classification
 */

const CONSTRUCTION_KEYWORDS = [
  // Infrastructure
  'infrastructure', 'civil works', 'civil engineering',
  
  // Roads & Transport
  'road', 'highway', 'motorway', 'bridge', 'tunnel', 'airport', 'runway',
  'footpath', 'cycleway', 'carpark', 'car park', 'street',
  
  // Buildings
  'construction', 'building', 'hospital', 'school', 'university', 'education facility',
  'health facility', 'medical centre', 'community centre', 'library',
  
  // Defence
  'defence', 'defense', 'military', 'base', 'barracks',
  
  // Utilities & Services
  'drainage', 'stormwater', 'sewer', 'water treatment', 'wastewater',
  'water supply', 'sewerage',
  
  // Landscaping & Site
  'landscaping', 'earthworks', 'site works', 'ground works', 'civil construction',
  'retaining wall', 'fencing',
  
  // Structural
  'structural', 'demolition', 'renovation', 'refurbishment',
  'fit-out', 'fitout', 'architectural', 'maintenance',
  
  // Council specific
  'park', 'playground', 'sports field', 'oval', 'pavilion',
  'toilet block', 'depot', 'waste facility'
];

function isConstructionRelated(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CONSTRUCTION_KEYWORDS.some(keyword => lower.includes(keyword));
}

function categorizeProject(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  // Priority categories (most specific first)
  if (text.match(/defence|defense|military|base|barracks/i)) 
    return 'Defence';
  
  if (text.match(/airport|runway|aviation/i)) 
    return 'Airports & Aviation';
  
  if (text.match(/hospital|health|medical centre|clinic/i)) 
    return 'Hospitals & Healthcare';
  
  if (text.match(/school|university|education|campus|college/i)) 
    return 'Schools & Education';
  
  if (text.match(/road|highway|motorway|street|pavement|footpath|cycleway/i)) 
    return 'Roads & Highways';
  
  if (text.match(/bridge|tunnel|overpass/i)) 
    return 'Bridges & Tunnels';
  
  if (text.match(/drainage|stormwater|sewer|wastewater|water treatment|sewerage/i)) 
    return 'Drainage & Water';
  
  if (text.match(/landscaping|park|garden|ground works|playground|sports field/i)) 
    return 'Landscaping & Parks';
  
  if (text.match(/rail|train|metro|light rail/i)) 
    return 'Rail';
  
  if (text.match(/building|facility|construction|community centre|library/i)) 
    return 'Buildings & Facilities';
  
  if (text.match(/civil works|civil engineering|infrastructure/i)) 
    return 'Civil & Infrastructure';
  
  if (text.match(/waste|depot|toilet block/i))
    return 'Council Services';
  
  return 'General Construction';
}

module.exports = {
  CONSTRUCTION_KEYWORDS,
  isConstructionRelated,
  categorizeProject
};
