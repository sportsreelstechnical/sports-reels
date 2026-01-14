export const POSITIONAL_METRICS_PROMPTS: Record<string, string> = {
  gk: `Focus on GOALKEEPER-specific metrics:
- Saves made and save percentage
- Goals conceded
- Clean sheet performance
- Distribution accuracy (short and long passes)
- Crosses claimed vs punched
- One-on-one situations faced
- Positioning and command of area
- Communication with defense`,

  defender: `Focus on DEFENDER-specific metrics:
- Tackles won and tackle success rate
- Aerial duels won and percentage
- Interceptions and blocks
- Clearances
- Progressive carries and passes
- Ball recoveries
- Fouls committed
- Ground duels success rate
- Defensive positioning`,

  midfielder: `Focus on MIDFIELDER-specific metrics:
- Pass completion rate (short, medium, long)
- Key passes and through balls
- Progressive passes and carries
- Ball recoveries and interceptions
- Ground duels won
- Shot creating actions
- Defensive contributions
- Distance covered and high-intensity runs
- Possession retention`,

  winger: `Focus on WINGER-specific metrics:
- Successful dribbles and take-ons
- Crosses attempted and completed
- Key passes and assists
- Shot creating actions and goal involvement
- Final third entries
- Progressive carries
- 1v1 success rate
- Defensive tracking back
- Sprint speed and acceleration`,

  striker: `Focus on STRIKER/FORWARD-specific metrics:
- Goals scored and xG (expected goals)
- Shots on target and shot accuracy
- Conversion rate
- Aerial duels won
- Hold-up play and link-up passes
- Pressing actions and ball recoveries in final third
- Movement and runs behind defense
- xA (expected assists) if applicable
- Penalty area touches`,
};

export const DEFAULT_METRICS_PROMPT = (position: string) =>
  `Analyze general football performance metrics for this position: ${position}`;
