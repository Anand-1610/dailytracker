/* =========================================================
   PDF EXPORT LOGIC
   ========================================================= */

const exportBtn = document.getElementById("exportPdfBtn");
const root = document.getElementById("pdfRoot");

exportBtn.addEventListener("click", () => {
  const monthText = document.getElementById("month").selectedOptions[0].text;
  const year = document.getElementById("year").value;

  const filename = `Habit_Report_${monthText}_${year}.pdf`;

  const options = {
    margin: 10,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    }
  };

  html2pdf().set(options).from(root).save();
});
