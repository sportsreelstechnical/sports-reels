import { usersRepository } from "./users";
import { teamsRepository } from "./teams";
import { playersRepository } from "./players";
import { videosRepository } from "./videos";
import { documentsRepository } from "./documents";
import { transfersRepository } from "./transfers";
import { messagingRepository } from "./messaging";
import { complianceRepository } from "./compliance";
import { scoutingRepository } from "./scouting";
import { tokensRepository } from "./tokens";
import { adminRepository } from "./admin";
import { embassyRepository } from "./embassy";
import { federationRepository } from "./federation";
import { miscRepository } from "./misc";

export const storage = {
  ...usersRepository,
  ...teamsRepository,
  ...playersRepository,
  ...videosRepository,
  ...documentsRepository,
  ...transfersRepository,
  ...messagingRepository,
  ...complianceRepository,
  ...scoutingRepository,
  ...tokensRepository,
  ...adminRepository,
  ...embassyRepository,
  ...federationRepository,
  ...miscRepository,
};

export {
  usersRepository,
  teamsRepository,
  playersRepository,
  videosRepository,
  documentsRepository,
  transfersRepository,
  messagingRepository,
  complianceRepository,
  scoutingRepository,
  tokensRepository,
  adminRepository,
  embassyRepository,
  federationRepository,
  miscRepository,
};
