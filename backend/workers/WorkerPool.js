const { Worker } = require("worker_threads");

class WorkerPool {
  constructor(workerPath, poolSize = 2) {
    this.workerPath = workerPath;
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];

    for (let i = 0; i < poolSize; i++) {
      this._addWorker();
    }
  }

  _addWorker() {
    const worker = new Worker(this.workerPath);
    const workerWrapper = { worker, busy: false };

    worker.on("error", (err) => {
      console.error(`Worker error (${this.workerPath}):`, err.message);
      const idx = this.workers.indexOf(workerWrapper);
      if (idx !== -1) this.workers.splice(idx, 1);

      this._addWorker();

      if (workerWrapper._reject) {
        workerWrapper._reject(err);
      }
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        const idx = this.workers.indexOf(workerWrapper);
        if (idx !== -1) this.workers.splice(idx, 1);
        this._addWorker();
      }
    });

    this.workers.push(workerWrapper);
  }

  runTask(data, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject, timeoutMs };

      const available = this.workers.find((w) => !w.busy);
      if (available) {
        this._executeTask(available, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  _executeTask(workerWrapper, task) {
    workerWrapper.busy = true;
    workerWrapper._reject = task.reject;

    const timeout = setTimeout(() => {
      workerWrapper.worker.removeAllListeners("message");
      workerWrapper.busy = false;
      workerWrapper._reject = null;
      task.reject(new Error("Worker timed out"));
      this._processQueue();
    }, task.timeoutMs);

    const onMessage = (result) => {
      clearTimeout(timeout);
      workerWrapper.busy = false;
      workerWrapper._reject = null;

      if (result.error) {
        task.reject(new Error(result.error));
      } else {
        task.resolve(result);
      }

      this._processQueue();
    };

    workerWrapper.worker.once("message", onMessage);
    workerWrapper.worker.postMessage(task.data);
  }

  _processQueue() {
    if (this.taskQueue.length === 0) return;

    const available = this.workers.find((w) => !w.busy);
    if (available) {
      const task = this.taskQueue.shift();
      this._executeTask(available, task);
    }
  }

  async shutdown() {
    for (const { worker } of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
    this.taskQueue = [];
  }
}

module.exports = WorkerPool;
