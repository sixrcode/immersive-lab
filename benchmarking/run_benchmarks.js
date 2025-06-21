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
const CONCURRENT_REQUESTS = 20; // Number of concurrent requests for load testing

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

  const allPrompts = await loadSampleData(PROMPTS_FILE);

  // --- PromptToPrototype Load Test ---
  const spaceAdventurePrompt = allPrompts.find(p => p.id === "prompt_006_space_adventure_default_style");
  if (!spaceAdventurePrompt) {
    console.error("Error: 'prompt_006_space_adventure_default_style' not found in prompts.json. Skipping PromptToPrototype load test.");
  } else {
    console.log(`
Running load test for PromptToPrototype with prompt "${spaceAdventurePrompt.id}" (${CONCURRENT_REQUESTS} concurrent requests)...`);
    const loadTestPromises = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      // Create a unique sampleId for each concurrent request to distinguish them in logs/results
      const sampleId = `${spaceAdventurePrompt.id}_concurrent_req_${i + 1}`;
      loadTestPromises.push(runBenchmark('/promptToPrototype', spaceAdventurePrompt.payload, sampleId, 'promptToPrototypeLoadTest'));
    }

    const loadTestRawResults = await Promise.all(loadTestPromises);
    loadTestRawResults.forEach(result => {
      allResults.push(result); // Add to overall results
      console.log(`  Request ${result.sampleId} finished in ${result.responseTime}ms. Success: ${result.successStatus}, Complete: ${result.completenessCheck}`);
      if (result.errorDetails) {
        console.error(`    Error for ${result.sampleId}: ${JSON.stringify(result.errorDetails)}`);
      }
    });

    const promptToPrototypeLoadTestTimes = loadTestRawResults
      .filter(r => r.successStatus && r.completenessCheck)
      .map(r => r.responseTime);

    if (promptToPrototypeLoadTestTimes.length > 0) {
      const avgResponseTime = promptToPrototypeLoadTestTimes.reduce((sum, time) => sum + time, 0) / promptToPrototypeLoadTestTimes.length;
      console.log(`  Average response time for PromptToPrototype load test (${promptToPrototypeLoadTestTimes.length} successful requests): ${avgResponseTime.toFixed(2)}ms`);
      const minTime = Math.min(...promptToPrototypeLoadTestTimes);
      const maxTime = Math.max(...promptToPrototypeLoadTestTimes);
      console.log(`  Min/Max response time: ${minTime.toFixed(2)}ms / ${maxTime.toFixed(2)}ms`);
    } else {
      console.warn("  No successful requests in the PromptToPrototype load test to calculate average time.");
    }
    // Note: Performance regression check against baseline might not be directly applicable here
    // as this is a load test, not a single sequential run. We're more interested in individual step timings from console.time.
  }

  // --- Original Sequential Benchmarks (Optional - can be kept or removed) ---
  console.log(`
Running original sequential benchmarks...`);
  const promptsForSequential = allPrompts.filter(p => p.id !== "prompt_006_space_adventure_default_style"); // Exclude the one used in load test if desired
  console.log(`Running sequential benchmarks for PromptToPrototype (${promptsForSequential.length} other samples)...`);
  let promptToPrototypeSequentialResults = [];
  for (const prompt of promptsForSequential) {
    console.log(`  Benchmarking prompt: ${prompt.id}`);
    const result = await runBenchmark('/promptToPrototype', prompt.payload, prompt.id, 'promptToPrototype');
    allResults.push(result);
    promptToPrototypeSequentialResults.push(result.responseTime);
    console.log(`    ...done in ${result.responseTime}ms. Success: ${result.successStatus}, Complete: ${result.completenessCheck}`);
  }
  if (promptsForSequential.length > 0) {
    checkPerformance('promptToPrototypeSequential', promptToPrototypeSequentialResults, baselineData.promptToPrototype);
  }


  const scripts = await loadSampleData(SCRIPTS_FILE);
  console.log(`
Running benchmarks for AnalyzeScript (${scripts.length} samples)...`);
  let analyzeScriptResults = [];
  for (const script of scripts) {
    console.log(`  Benchmarking script: ${script.id}`);
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
