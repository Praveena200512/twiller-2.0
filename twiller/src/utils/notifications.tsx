export const KEYWORDS = ["cricket", "science"];

export const containsKeyword = (
  text: string
) => {
  return KEYWORDS.some((keyword) =>
    text.toLowerCase().includes(keyword)
  );
};

export const requestNotificationPermission =
  async () => {
    if (!("Notification" in window))
      return false;

    if (
      Notification.permission === "granted"
    )
      return true;

    const permission =
      await Notification.requestPermission();

    return permission === "granted";
  };

export const showKeywordNotification = (
  tweetText: string
) => {
  if (!("Notification" in window))
    return;

  if (
    Notification.permission !== "granted"
  )
    return;

  new Notification(
    "Twiller Keyword Alert",
    {
      body: tweetText,
      icon: "/favicon.ico",
    }
  );
};