// run_benchmarks.js
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Make sure to install axios: npm install axios

// --- Configuration ---
const API_BASE_URL = process.env.BENCHMARK_API_BASE_URL || 'http://localhost:5001/your-project-id/us-central1/aiApi'; // Replace with actual
const PROMPTS_FILE = path.join(__dirname, 'sample_data', 'prompts.json');
const SCRIPTS_FILE = path.join(__dirname, 'sample_data', 'scripts.json');
const RESULTS_DIR = path.join(__dirname, 'results');
const BENCHMARK_BASELINE_FILE = path.join(__dirname, 'benchmark_baseline.json');

// --- Global State ---
let performanceRegressionDetected = false;

// --- Helper Functions ---
function checkPerformance(featureName, currentRunTimes, baselineFeatureData) {
  if (!currentRunTimes || currentRunTimes.length === 0) {
    console.warn(`Warning: No current run times available for ${featureName} to check performance.`);
    return;
  }
  const currentAvgResponseTime = currentRunTimes.reduce((sum, time) => sum + time, 0) / currentRunTimes.length;
  console.log(`  Average response time for ${featureName} (current run): ${currentAvgResponseTime.toFixed(2)}ms`);

  if (!baselineFeatureData) {
    console.warn(`Warning: No baseline data found for feature "${featureName}". Skipping performance regression check.`);
    return;
  }
  if (typeof baselineFeatureData.avgResponseTime !== 'number') {
    console.warn(`Warning: Baseline data for feature "${featureName}" does not have a valid 'avgResponseTime'. Skipping performance regression check.`);
    return;
  }

  const baselineAvgResponseTime = baselineFeatureData.avgResponseTime;
  console.log(`  Baseline average response time for ${featureName}: ${baselineAvgResponseTime.toFixed(2)}ms`);

  if (currentAvgResponseTime > 2 * baselineAvgResponseTime) {
    console.error(`
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  PERFORMANCE REGRESSION DETECTED for ${featureName}!
  Current average response time (${currentAvgResponseTime.toFixed(2)}ms) is more than 2x the baseline (${baselineAvgResponseTime.toFixed(2)}ms).
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    performanceRegressionDetected = true;
  }
}

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
  let baselineData = {};

  console.log('Starting benchmarks...');
  console.log(`Using API_BASE_URL: ${API_BASE_URL}`);

  // Load baseline data
  try {
    if (fs.existsSync(BENCHMARK_BASELINE_FILE)) {
      const rawBaseline = fs.readFileSync(BENCHMARK_BASELINE_FILE);
      baselineData = JSON.parse(rawBaseline);
      console.log(`Loaded baseline data from ${BENCHMARK_BASELINE_FILE}`);
    } else {
      console.warn(`Warning: Baseline file not found at ${BENCHMARK_BASELINE_FILE}. Benchmarks will run without baseline comparison.`);
    }
  } catch (error) {
    console.warn(`Warning: Error loading or parsing baseline file ${BENCHMARK_BASELINE_FILE}:`, error.message);
    console.warn('Benchmarks will run without baseline comparison.');
    baselineData = {}; // Ensure it's an object if parsing failed
  }

  const prompts = await loadSampleData(PROMPTS_FILE);
  console.log(`
Running benchmarks for PromptToPrototype (${prompts.length} samples)...`);
  let promptToPrototypeResults = [];
  for (const prompt of prompts) {
    console.log(`  Benchmarking prompt: ${prompt.id}`);
    // Pass baselineData.promptToPrototype to runBenchmark (removed)
    const result = await runBenchmark('/promptToPrototype', prompt.payload, prompt.id, 'promptToPrototype');
    allResults.push(result);
    promptToPrototypeResults.push(result.responseTime);
    console.log(`    ...done in ${result.responseTime}ms. Success: ${result.successStatus}, Complete: ${result.completenessCheck}`);
  }
  checkPerformance('promptToPrototype', promptToPrototypeResults, baselineData.promptToPrototype);


  const scripts = await loadSampleData(SCRIPTS_FILE);
  console.log(`
Running benchmarks for AnalyzeScript (${scripts.length} samples)...`);
  let analyzeScriptResults = [];
  for (const script of scripts) {
    console.log(`  Benchmarking script: ${script.id}`);
    // Pass baselineData.analyzeScript to runBenchmark (removed)
    const result = await runBenchmark('/analyzeScript', script.payload, script.id, 'analyzeScript');
    allResults.push(result);
    analyzeScriptResults.push(result.responseTime);
    console.log(`    ...done in ${result.responseTime}ms. Success: ${result.successStatus}, Complete: ${result.completenessCheck}`);
  }
  checkPerformance('analyzeScript', analyzeScriptResults, baselineData.analyzeScript);

  const resultsFilename = path.join(RESULTS_DIR, `benchmark_results_${new Date().toISOString().replace(/:/g, '-')}.json`);
  try {
    fs.writeFileSync(resultsFilename, JSON.stringify(allResults, null, 2));
    console.log(`
Benchmark results saved to: ${resultsFilename}`);
  } catch (error) {
    console.error('Error saving benchmark results:', error);
  }

  console.log('\nBenchmarking complete.');

  if (performanceRegressionDetected) {
    console.error('\nPerformance regression detected. Exiting with status 1.');
    process.exit(1);
  }
}

main().catch(console.error);
