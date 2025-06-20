// run_benchmarks.js
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Make sure to install axios: npm install axios

// --- Configuration ---
const API_BASE_URL = 'http://localhost:5001/your-project-id/us-central1/aiApi'; // Replace with actual
const PROMPTS_FILE = path.join(__dirname, 'sample_data', 'prompts.json');
const SCRIPTS_FILE = path.join(__dirname, 'sample_data', 'scripts.json');
const RESULTS_DIR = path.join(__dirname, 'results');

// --- Helper Functions ---
function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    console.log(`Created results directory: ${RESULTS_DIR}`);
  }
}

async function loadSampleData(filePath) {
  try {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error loading sample data from ${filePath}:`, error);
    return [];
  }
}

async function runBenchmark(apiEndpoint, payload, sampleId, featureName) {
  const startTime = Date.now();
  let httpStatusCode = null;
  let responseData = null;
  let errorDetails = null;

  try {
    // Note: Assumes RUNNING_BENCHMARKS=true is set in the environment
    // where this script is executed, for the auth bypass to work.
    const response = await axios.post(`${API_BASE_URL}${apiEndpoint}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    httpStatusCode = response.status;
    responseData = response.data;
  } catch (error) {
    console.error(`Error during benchmark for ${featureName} - ${sampleId}:`, error.message);
    httpStatusCode = error.response ? error.response.status : null;
    errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? error.response.data : null
    };
  }
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  const successStatus = httpStatusCode === 200;

  let completenessCheck = false;
  if (successStatus && responseData) {
    if (featureName === 'promptToPrototype') {
      completenessCheck = responseData.hasOwnProperty('loglines') &&
                          responseData.hasOwnProperty('moodBoardImage') &&
                          responseData.hasOwnProperty('moodBoardCells') &&
                          responseData.hasOwnProperty('shotList') &&
                          responseData.hasOwnProperty('pitchSummary');
    } else if (featureName === 'analyzeScript') {
      completenessCheck = responseData.hasOwnProperty('analysis') &&
                          responseData.hasOwnProperty('suggestions');
    }
  }

  return {
    timestamp: new Date().toISOString(),
    featureName,
    sampleId,
    responseTime, // ms
    successStatus,
    httpStatusCode,
    completenessCheck,
    responseData: successStatus && completenessCheck ? responseData : (responseData ? 'omitted_incomplete_response' : null),
    errorDetails
  };
}

// --- Main Logic ---
async function main() {
  ensureResultsDir();
  const allResults = [];

  console.log('Starting benchmarks...');

  const prompts = await loadSampleData(PROMPTS_FILE);
  console.log(`
Running benchmarks for PromptToPrototype (${prompts.length} samples)...`);
  for (const prompt of prompts) {
    console.log(`  Benchmarking prompt: ${prompt.id}`);
    const result = await runBenchmark('/promptToPrototype', prompt.payload, prompt.id, 'promptToPrototype');
    allResults.push(result);
    console.log(`    ...done in ${result.responseTime}ms. Success: ${result.successStatus}, Complete: ${result.completenessCheck}`);
  }

  const scripts = await loadSampleData(SCRIPTS_FILE);
  console.log(`
Running benchmarks for AnalyzeScript (${scripts.length} samples)...`);
  for (const script of scripts) {
    console.log(`  Benchmarking script: ${script.id}`);
    const result = await runBenchmark('/analyzeScript', script.payload, script.id, 'analyzeScript');
    allResults.push(result);
    console.log(`    ...done in ${result.responseTime}ms. Success: ${result.successStatus}, Complete: ${result.completenessCheck}`);
  }

  const resultsFilename = path.join(RESULTS_DIR, `benchmark_results_${new Date().toISOString().replace(/:/g, '-')}.json`);
  try {
    fs.writeFileSync(resultsFilename, JSON.stringify(allResults, null, 2));
    console.log(`
Benchmark results saved to: ${resultsFilename}`);
  } catch (error) {
    console.error('Error saving benchmark results:', error);
  }

  console.log('
Benchmarking complete.');
}

main().catch(console.error);
