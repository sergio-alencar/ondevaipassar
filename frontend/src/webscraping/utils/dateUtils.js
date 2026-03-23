export function parseMatchDate(dateTimeStr) {
  const [datePart, timePart] = dateTimeStr.split(" ");
  const [month, day] = datePart.split("/").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  const currentDate = new Date();
  let year = currentDate.getFullYear();
  if (month < currentDate.getMonth() + 1) year++;

  const date = new Date(year, month - 1, day, hours, minutes);
  date.setHours(date.getHours() - 3);

  return {
    timestamp: Math.floor(date.getTime() / 1000),
    isoString: date.toISOString(),
    formattedTime: timePart,
  };
}
