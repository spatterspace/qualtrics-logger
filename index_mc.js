/**
 * @typedef {Object} InteractionEvent
 * @property {string} QID
 * @property {number} timestamp
 * @property {number} choiceIndex
 * @property {'mouseenter' | 'mouseleave' | 'click'} type
 */

// Change to false if you don't want to record mouseenter and mouseleave events (each CSV will then just have one row)
const registerHoverEvents = true;

Qualtrics.SurveyEngine.addOnReady(function () {
  // If we're on the page with the participant ID input, watch that and store it in localStorage
  const participantIdInput = document.getElementById("QR~QID1");
  if (participantIdInput) {
    participantIdInput.addEventListener("change", () => {
      localStorage.setItem("participantId", participantIdInput.value);
    });
    return;
  }

  // Each question has a series of multiple choice boxes that are covered by a label hitbox.
  // Watch for events on that label and store them in interactionEvents
  const questionBodies = document.querySelectorAll(".QuestionBody");
  const questionBody = questionBodies[0]; // There should only actually be 1 question per page

  const interactionEvents = [];

  const labelBoxes = questionBody.querySelectorAll(".SingleAnswer");

  labelBoxes.forEach((labelBox) => {
    const [_, questionId, choiceIndex] = labelBox
      .getAttribute("for")
      .split("~");

    const pushEvent = (type) => {
      interactionEvents.push({
        QID: questionId,
        timestamp: Date.now(),
        choiceIndex,
        type,
      });
    };

    if (registerHoverEvents) {
      labelBox.addEventListener("mouseenter", () => {
        pushEvent("mouseenter");
      });

      labelBox.addEventListener("mouseleave", () => {
        pushEvent("mouseleave");
      });
    }

    // When a multiple choice is clicked, register that as the final event and trigger the CSV download
    labelBox.addEventListener("click", () => {
      pushEvent("click");
      printInteractionEvents();
    });
  });

  function printInteractionEvents() {
    const csvRows = [["timestamp", "QID", "choiceIndex", "type"]];

    const QID = interactionEvents[0].QID; // If we go back to having multiple questions per page, this can be concatinated from a set

    interactionEvents.forEach((event) => {
      csvRows.push([event.timestamp, event.QID, event.choiceIndex, event.type]);
    });

    const csvContent = csvRows
      .map((row) => row.map((cell) => '"' + cell + '"').join(","))
      .join("\n");

    const participantId = localStorage.getItem("participantId");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      participantId + "_" + QID + "_" + "interactions.csv"
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
});
