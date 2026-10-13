import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AchievementCard } from "../src/achievement-card";

test("earned badge separates sharing from its progress and date", async () => {
  const share = jest.fn();
  await render(<AchievementCard title="First Breath" description="Your first practice" earnedDate="2026-10-13" progress={1} target={1} action="Share achievement" onPress={share} />);
  expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(1);
  expect(screen.getByText(/Earned/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Share achievement" }));
  expect(share).toHaveBeenCalledTimes(1);
});
test("locked badge clamps progress and offers practice instead of sharing", async () => {
  await render(<AchievementCard title="First Breath" description="Your first practice" progress={-1} target={1} action="Start practice" onPress={() => {}} />);
  expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(0);
  expect(screen.queryByRole("button", { name: "Share achievement" })).toBeNull();
});
