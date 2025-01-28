/**
 * @typedef {Object} SliderState
 * @property {Array<{timestamp: number, value: number}>} values - Slider value **changes** with timestamps
 * @property {Array<{timestamp: number, type: 'mouseenter' | 'mouseleave'}>} mouseEvents - Mouse interaction events with timestamps
 */

/**
 * @typedef {Object} QuestionState
 * @property {string} importId - Id that should match the CSV output
 * @property {Object.<string, SliderState>} sliders - Map of slider indices to their states
 */

Qualtrics.SurveyEngine.addOnReady(function () {
  console.log("on ready!");

  /** @type {Map<string, QuestionState>} */
  const questionStates = new Map();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const sliderId = mutation.target.id;
        const [questionId, sliderIndex] = sliderId.split("~");
        const value = Number(mutation.target.getAttribute("aria-valuenow"));
        const timestamp = Date.now();

        const questionState = questionStates.get(questionId);

        const values = questionState.sliders[sliderIndex].values;

        if (values.length === 0 || values.at(-1).value !== value) {
          values.push({
            timestamp,
            value,
          });
        }
      }
    });
  });
  const questionsWithSliders = document.querySelectorAll(
    ".QuestionOuter:has(.slider-container)"
  );

  for (const questionContainer of questionsWithSliders) {
    const importId = questionContainer.id;
    /** @type QuestionState */
    const questionState = {
      importId,
      sliders: {},
    };
    questionStates.set(importId, questionState);
    const sliderContainers =
      questionContainer.querySelectorAll(".slider-container");
    for (const sliderContainer of sliderContainers) {
      const slider = sliderContainer.querySelector("div[role='slider']");
      const [, sliderIndex] = slider.id.split("~");

      questionState.sliders[sliderIndex] = {
        values: [],
        mouseEvents: [],
      };

      observer.observe(slider, {
        attributes: true,
      });

      sliderContainer.addEventListener("mouseenter", () => {
        const timestamp = Date.now();
        questionState.sliders[sliderIndex].mouseEvents.push({
          timestamp,
          type: "mouseenter",
        });
      });

      sliderContainer.addEventListener("mouseleave", () => {
        const timestamp = Date.now();
        questionState.sliders[sliderIndex].mouseEvents.push({
          timestamp,
          type: "mouseleave",
        });
      });
    }
  }

  document.getElementById("NextButton").addEventListener("click", () => {
    if (questionsWithSliders.length === 0) {
      let idNumber = document.querySelector(".InputText")?.value;
      if (idNumber) {
        localStorage.setItem("participantId", idNumber);
        console.log(idNumber);
      }
      return;
    }
    let idNumber = localStorage.getItem("participantId");
    // Convert question states to CSV
    const csvRows = [];

    // Add header row
    csvRows.push(["timestamp", "questionId", "sliderId", "eventType", "value"]);

    const allEvents = [];

    questionStates.forEach((questionState, questionId) => {
      Object.entries(questionState.sliders).forEach(
        ([sliderIndex, sliderState]) => {
          sliderState.values.forEach(({ timestamp, value }) => {
            allEvents.push({
              timestamp,
              questionId: questionState.importId,
              sliderId: sliderIndex,
              eventType: "value",
              value,
            });
          });

          // Add mouse events
          sliderState.mouseEvents.forEach(({ timestamp, type }) => {
            allEvents.push({
              timestamp,
              questionId: questionState.importId,
              sliderId: sliderIndex,
              eventType: type,
              value: "",
            });
          });
        }
      );
    });

    allEvents.sort((a, b) => a.timestamp - b.timestamp);

    allEvents.forEach((event) => {
      csvRows.push([
        event.timestamp,
        event.questionId,
        event.sliderId,
        event.eventType,
        event.value,
      ]);
    });

    const csvContent = csvRows
      .map((row) => row.map((cell) => '"' + cell + '"').join(","))
      .join("\n");

    console.log(csvContent);

    // Manually creates a download link and clicks on it
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", idNumber + "_interactions.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
});
