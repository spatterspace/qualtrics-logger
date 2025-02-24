/**
 * @typedef {Object} SliderState
 * @property {Array<{timestamp: number, value: number}>} values - Slider value **changes** with timestamps
 * @property {Array<{timestamp: number, type: 'mouseenter' | 'mouseleave', value: number}>} mouseEvents - Mouse interaction events with timestamps. `value` is the slider value at the time of the event
 */

/**
 * @typedef {Object} QuestionState
 * @property {string} questionId - Id that should match the CSV output
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

        const sliderState = questionStates.get(questionId).sliders[sliderIndex];

        if (
          sliderState.mouseEvents.length &&
          sliderState.values.at(-1)?.value !== value
        ) {
          sliderState.values.push({
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
    const questionId = questionContainer.id;
    /** @type QuestionState */
    const questionState = {
      questionId,
      sliders: {},
    };
    questionStates.set(questionId, questionState);
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
        const value = Number(slider.getAttribute("aria-valuenow"));
        questionState.sliders[sliderIndex].mouseEvents.push({
          timestamp,
          type: "mouseenter",
          value,
        });
      });

      sliderContainer.addEventListener("mouseleave", () => {
        const timestamp = Date.now();
        const value = Number(slider.getAttribute("aria-valuenow"));
        questionState.sliders[sliderIndex].mouseEvents.push({
          timestamp,
          type: "mouseleave",
          value,
        });
      });
    }
  }

  function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
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

    const csvRows = [];

    csvRows.push([
      "timestamp",
      "time string",
      "questionId",
      "sliderId",
      "eventType",
      "value",
    ]);

    /**
     * @type {Array<{
     *   timestamp: number,
     *   timeString: string,
     *   questionId: string,
     *   sliderId: string,
     *   eventType: "value" | "mouseenter" | "mouseleave",
     *   value: number
     * }>}
     */
    const allEvents = [];

    questionStates.forEach((questionState, questionId) => {
      Object.entries(questionState.sliders).forEach(
        ([sliderIndex, sliderState]) => {
          sliderState.values.forEach(({ timestamp, value }) => {
            allEvents.push({
              timestamp,
              timeString: formatTimestamp(timestamp),
              questionId: questionState.questionId,
              sliderId: sliderIndex,
              eventType: "value",
              value,
            });
          });

          sliderState.mouseEvents.forEach(({ timestamp, type, value }) => {
            allEvents.push({
              timestamp,
              timeString: formatTimestamp(timestamp),
              questionId: questionState.questionId,
              sliderId: sliderIndex,
              eventType: type,
              value,
            });
          });
        }
      );
    });

    allEvents.sort((a, b) => a.timestamp - b.timestamp);

    allEvents.forEach((event) => {
      csvRows.push([
        event.timestamp,
        event.timeString,
        event.questionId,
        event.sliderId,
        event.eventType,
        event.value,
      ]);
    });

    const csvContent = csvRows
      .map((row) => row.map((cell) => '"' + cell + '"').join(","))
      .join("\n");

    console.log("idNumber", idNumber);
    console.log(csvContent);

    // Get all unique question IDs
    const questionIds = Array.from(questionStates.keys()).join("_");

    // Manually creates a download link and clicks on it
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      idNumber + "_" + questionIds + "_" + "interactions.csv"
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
});
