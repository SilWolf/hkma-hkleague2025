import { createClient } from "@sanity/client";
import { cache } from "react";
import { getYoutubeThumbnailByUrl } from "./youtube.helper";
import {
  Match,
  Player,
  Team,
  TeamPlayer,
  TournamentTeam,
} from "@/types/index.type";

const STAGES = {
  regulars: {
    tournamentId: process.env.SANITY_DEFAULT_TOURNAMENT_ID,
  },
  semifinals: {
    tournamentId: process.env.SANITY_SEMIFINALS_TOURNAMENT_ID,
  },
  finals: {
    tournamentId: process.env.SANITY_FINALS_TOURNAMENT_ID,
  },
} as const;

const CURRENT_STAGE_TOURNAMENT_ID = STAGES.regulars.tournamentId;

const PLAYER_PROJECTION = `_id, name, nickname, designation, "portraitImage": portraitImage.asset->url, introduction`;
const TEAM_PROJECTION = `{_id, "slug": slug.current, name, secondaryName, thirdName, "squareLogoImage": squareLogoImage.asset->url, "color": color.hex, introduction}`;
const TEAM_PLAYER_PROJECTION = `{team->${TEAM_PROJECTION}, player->{${PLAYER_PROJECTION}}, overridedDesignation, overridedName, overridedNickname, "overridedColor": overridedColor.hex, "overridedPortraitImage": overridedPortraitImage.asset->url}`;

export const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET_ID,
  useCdn: true,
  apiVersion: "2023-05-03",
  token: process.env.SANITY_SECRET_TOKEN, // Only if you want to update content with the client
});

const publicClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET_ID,
  useCdn: true,
  apiVersion: "2023-05-03",
});

export const getRegularTeams = cache(() =>
  publicClient
    .fetch(
      `*[_type == "matchTournament" && _id == "${process.env.SANITY_DEFAULT_TOURNAMENT_ID}"]{ teams[]{ _id, ranking, point, matchCount, team->${TEAM_PROJECTION}, overridedName, overridedSecondaryName, overridedColor, "overridedSquareLogoImage": overridedSquareLogoImage.asset->url, "overridedColor": overridedColor.hex, overridedIntroduction } }`
    )
    .then((tournaments) =>
      (tournaments[0]?.teams as TournamentTeam[]).map((team) => ({
        ...team,
        team: formatTeamPlayerDTO(
          {
            ...team.team,
            name: team.overridedName || team.team.name,
            secondaryName:
              team.overridedSecondaryName || team.team.secondaryName,
            color: team.overridedColor || team.team.color,
            squareLogoImage:
              team.overridedSquareLogoImage || team.team.squareLogoImage,
            introduction: team.overridedIntroduction || team.team.introduction,
          },
          null
        ),
      }))
    )
);

export const getTeams = cache(() =>
  publicClient
    .fetch(
      `*[_type == "matchTournament" && _id == "${CURRENT_STAGE_TOURNAMENT_ID}"]{ teams[]{ _id, ranking, point, matchCount, team->${TEAM_PROJECTION}, overridedName, overridedSecondaryName, overridedColor, "overridedSquareLogoImage": overridedSquareLogoImage.asset->url, "overridedColor": overridedColor.hex, overridedIntroduction } }`
    )
    .then((tournaments) =>
      (tournaments[0]?.teams as TournamentTeam[]).map((team) => ({
        ...team,
        team: formatTeamPlayerDTO(
          {
            ...team.team,
            name: team.overridedName || team.team.name,
            secondaryName:
              team.overridedSecondaryName || team.team.secondaryName,
            color: team.overridedColor || team.team.color,
            squareLogoImage:
              team.overridedSquareLogoImage || team.team.squareLogoImage,
            introduction: team.overridedIntroduction || team.team.introduction,
          },
          null
        ),
      }))
    )
);

export const getTeamSlugs = cache(() =>
  publicClient
    .fetch(
      `*[_type == "matchTournament" && _id == "${process.env.SANITY_DEFAULT_TOURNAMENT_ID}"]{ teams[]{ "slug": team->slug.current } }`
    )
    .then((tournaments) =>
      (tournaments[0]?.teams as Team[]).map((team) => team.slug)
    )
);

export const getTeamDetailBySlug = cache(async (slug: string) => {
  const team = await publicClient
    .fetch(`*[_type == "team" && slug.current == "${slug}"]${TEAM_PROJECTION}`)
    .then((teams) => teams[0] as Team);

  if (!team) {
    return null;
  }

  const players = await publicClient
    .fetch(
      `*[_type == "teamPlayer" && team._ref == "${team._id}"] | order(player->name asc){ team->{_id}, player->{${PLAYER_PROJECTION}, "statistic": statistics[_key=="${process.env.SANITY_DEFAULT_TOURNAMENT_ID}"][0]}, overridedDesignation, overridedName, overridedNickname, "overridedColor": overridedColor.hex, introduction}`
    )
    .then((teamPlayers: TeamPlayer[]) =>
      teamPlayers.map((teamPlayer) => ({
        ...formatTeamPlayerDTO(null, teamPlayer),
        statistic: teamPlayer.player.statistic!,
      }))
    );

  return {
    ...formatTeamPlayerDTO(team),
    players,
  };
});

export const getPlayersGroupByTeams = cache(async () => {
  const teamIds = await publicClient
    .fetch(
      `*[_type == "matchTournament" && _id == "${process.env.SANITY_DEFAULT_TOURNAMENT_ID}"]{ teams[]{ "teamId": team->_id } }`
    )
    .then(
      (tournaments) =>
        tournaments[0].teams.map(
          (team: { teamId: string }) => team.teamId
        ) as string[]
    );

  const teamPlayers = (await publicClient.fetch(
    `*[_type == "teamPlayer" && team._ref in ${JSON.stringify(
      teamIds
    )}] | order(player->name asc) { team->{_id}, player->{${PLAYER_PROJECTION}}, overridedDesignation, overridedName, overridedNickname, "overridedColor": overridedColor.hex, "overridedPortraitImage": overridedPortraitImage.asset->url}`
  )) as TeamPlayer[];

  const result: Record<string, (Player & { introduction: string })[]> = {};

  for (let i = 0; i < teamPlayers.length; i++) {
    const teamPlayer = teamPlayers[i];
    if (!result[teamPlayer.team._id]) {
      result[teamPlayer.team._id] = [];
    }

    result[teamPlayer.team._id].push({
      _id: teamPlayer.player._id,
      name: teamPlayer.overridedName ?? teamPlayer.player.name,
      nickname: teamPlayer.overridedNickname ?? teamPlayer.player.nickname,
      portraitImage:
        teamPlayer.overridedPortraitImage ?? teamPlayer.player.portraitImage,
      designation:
        teamPlayer.overridedDesignation ?? teamPlayer.player.designation,
      introduction: teamPlayer.introduction,
    });
  }

  return result;
});

export const getAllPlayersWithStat = cache(async () => {
  const players = await publicClient
    .fetch(
      `*[_type == "teamPlayer" && count(player->statistics[_key=="${process.env.SANITY_DEFAULT_TOURNAMENT_ID}"]) > 0] | order(player->name asc){ team->${TEAM_PROJECTION}, player->{${PLAYER_PROJECTION}, "statistic": statistics[_key=="${process.env.SANITY_DEFAULT_TOURNAMENT_ID}"][0]}, overridedDesignation, overridedName, overridedNickname, "overridedColor": overridedColor.hex, introduction}`
    )
    .then((teamPlayers: TeamPlayer[]) =>
      teamPlayers.map((teamPlayer) => ({
        ...formatTeamPlayerDTO(null, teamPlayer),
        statistic: teamPlayer.player.statistic!,
      }))
    );

  return players;
});

export const getOldMatches = cache(() =>
  publicClient
    .fetch(
      `*[_type == "match" && !(_id in path("drafts.**")) && tournament._ref == "${process.env.SANITY_DEFAULT_TOURNAMENT_ID}" && status == "completed"] | order(startAt desc)[0...8]{ _id, name, playerEast->${TEAM_PLAYER_PROJECTION}, playerSouth->${TEAM_PLAYER_PROJECTION}, playerWest->${TEAM_PLAYER_PROJECTION}, playerNorth->${TEAM_PLAYER_PROJECTION}, playerEastTeam->${TEAM_PROJECTION}, playerSouthTeam->${TEAM_PROJECTION}, playerWestTeam->${TEAM_PROJECTION}, playerNorthTeam->${TEAM_PROJECTION}, startAt, youtubeUrl, bilibiliUrl, result}`
    )
    .then((matches: Match[]) =>
      matches.map(
        ({
          playerEast,
          playerEastTeam,
          playerSouth,
          playerSouthTeam,
          playerWest,
          playerWestTeam,
          playerNorth,
          playerNorthTeam,
          ...match
        }) => ({
          ...match,
          playerEast: formatTeamPlayerDTO(playerEastTeam, playerEast),
          playerSouth: formatTeamPlayerDTO(playerSouthTeam, playerSouth),
          playerWest: formatTeamPlayerDTO(playerWestTeam, playerWest),
          playerNorth: formatTeamPlayerDTO(playerNorthTeam, playerNorth),
          youtubeThumbnailUrl: getYoutubeThumbnailByUrl(match.youtubeUrl),
        })
      )
    )
);

export const getMatch = cache(
  (matchId: string): Promise<MatchDTO> =>
    publicClient
      .fetch(
        `*[_type == "match" && _id == "${matchId}"]{ _id, name, playerEast->${TEAM_PLAYER_PROJECTION}, playerSouth->${TEAM_PLAYER_PROJECTION}, playerWest->${TEAM_PLAYER_PROJECTION}, playerNorth->${TEAM_PLAYER_PROJECTION}, playerEastTeam->${TEAM_PROJECTION}, playerSouthTeam->${TEAM_PROJECTION}, playerWestTeam->${TEAM_PROJECTION}, playerNorthTeam->${TEAM_PROJECTION}, startAt, youtubeUrl, bilibiliUrl, result, rounds}`
      )
      .then((matches: Match[]) => {
        const {
          playerEast,
          playerEastTeam,
          playerSouth,
          playerSouthTeam,
          playerWest,
          playerWestTeam,
          playerNorth,
          playerNorthTeam,
          ...matchRest
        } = matches[0];

        const newMatch: MatchDTO = {
          ...matchRest,
          playerEast: formatTeamPlayerDTO(playerEastTeam, playerEast),
          playerSouth: formatTeamPlayerDTO(playerSouthTeam, playerSouth),
          playerWest: formatTeamPlayerDTO(playerWestTeam, playerWest),
          playerNorth: formatTeamPlayerDTO(playerNorthTeam, playerNorth),
          _order: ["playerEast", "playerSouth", "playerWest", "playerNorth"],
        };

        if (
          playerEast &&
          playerEastTeam &&
          playerSouth &&
          playerSouthTeam &&
          playerWest &&
          playerWestTeam &&
          playerNorth &&
          playerNorthTeam
        ) {
          // assume both player and placeholder team exist

          const playersMap: Record<
            string,
            "playerEast" | "playerSouth" | "playerWest" | "playerNorth"
          > = {
            [playerEast.team._id]: "playerEast",
            [playerSouth.team._id]: "playerSouth",
            [playerWest.team._id]: "playerWest",
            [playerNorth.team._id]: "playerNorth",
          };

          newMatch._order = [
            playersMap[playerEastTeam._id],
            playersMap[playerSouthTeam._id],
            playersMap[playerWestTeam._id],
            playersMap[playerNorthTeam._id],
          ];
        }

        return newMatch;
      })
);

export const getLastDateFinishedMatchesGroupedByDate = cache(async () => {
  const playerProjection =
    '{team->{_id, name, "squareLogoImage": squareLogoImage.asset->url, "color": color.hex}}';
  const teamProjection = TEAM_PROJECTION;

  const scheduledMatches = await publicClient.fetch<Match[]>(
    `*[_type == "match" && !(_id in path("drafts.**")) && tournament._ref == "${CURRENT_STAGE_TOURNAMENT_ID}" && defined(result.playerEast.score)] | order(startAt desc)[0...2] { _id, name, playerEast->${playerProjection}, playerSouth->${playerProjection}, playerWest->${playerProjection}, playerNorth->${playerProjection}, playerEastTeam->${teamProjection}, playerSouthTeam->${teamProjection}, playerWestTeam->${teamProjection}, playerNorthTeam->${teamProjection}, startAt, youtubeUrl, bilibiliUrl, result}`
  );

  const matchesGroupedByDate: Record<
    string,
    { weekday: number; matches: MatchDTO[] }
  > = {};

  for (const match of scheduledMatches) {
    const {
      playerEast,
      playerEastTeam,
      playerSouth,
      playerSouthTeam,
      playerWest,
      playerWestTeam,
      playerNorth,
      playerNorthTeam,
      ...matchRest
    } = match;
    const dateString = `${matchRest.startAt.substring(
      8,
      10
    )}/${matchRest.startAt.substring(5, 7)}`;

    if (!matchesGroupedByDate[dateString]) {
      const date = new Date(matchRest.startAt);
      const weekday = date.getDay();

      matchesGroupedByDate[dateString] = {
        weekday,
        matches: [],
      };
    }

    const newMatch: MatchDTO = {
      ...matchRest,
      playerEast: formatTeamPlayerDTO(playerEastTeam, playerEast),
      playerSouth: formatTeamPlayerDTO(playerSouthTeam, playerSouth),
      playerWest: formatTeamPlayerDTO(playerWestTeam, playerWest),
      playerNorth: formatTeamPlayerDTO(playerNorthTeam, playerNorth),
      _order: ["playerEast", "playerSouth", "playerWest", "playerNorth"],
    };

    if (
      playerEast &&
      playerEastTeam &&
      playerSouth &&
      playerSouthTeam &&
      playerWest &&
      playerWestTeam &&
      playerNorth &&
      playerNorthTeam
    ) {
      // assume both player and placeholder team exist

      const playersMap: Record<
        string,
        "playerEast" | "playerSouth" | "playerWest" | "playerNorth"
      > = {
        [playerEast.team._id]: "playerEast",
        [playerSouth.team._id]: "playerSouth",
        [playerWest.team._id]: "playerWest",
        [playerNorth.team._id]: "playerNorth",
      };

      newMatch._order = [
        playersMap[playerEastTeam._id],
        playersMap[playerSouthTeam._id],
        playersMap[playerWestTeam._id],
        playersMap[playerNorthTeam._id],
      ];
    }

    matchesGroupedByDate[dateString].matches.unshift(newMatch);
  }

  const result = Object.entries(matchesGroupedByDate).map(([key, value]) => ({
    date: key,
    ...value,
  }));

  if (!result[0]) {
    return [];
  }

  return [result[0]];
});

export const getLatestComingMatchesGroupedByDate = cache(async () => {
  const playerProjection =
    '{team->{_id, name, "squareLogoImage": squareLogoImage.asset->url, "color": color.hex}}';
  const teamProjection = TEAM_PROJECTION;

  const scheduledMatches = await publicClient.fetch<Match[]>(
    `*[_type == "match" && !(_id in path("drafts.**")) && tournament._ref == "${CURRENT_STAGE_TOURNAMENT_ID}" && !defined(result.playerEast.score)] | order(startAt asc)[0...4] { _id, name, playerEast->${playerProjection}, playerSouth->${playerProjection}, playerWest->${playerProjection}, playerNorth->${playerProjection}, playerEastTeam->${teamProjection}, playerSouthTeam->${teamProjection}, playerWestTeam->${teamProjection}, playerNorthTeam->${teamProjection}, startAt, youtubeUrl, bilibiliUrl}`
  );

  const matchesGroupedByDate: Record<
    string,
    { weekday: number; matches: MatchDTO[] }
  > = {};

  for (const match of scheduledMatches) {
    const {
      playerEast,
      playerEastTeam,
      playerSouth,
      playerSouthTeam,
      playerWest,
      playerWestTeam,
      playerNorth,
      playerNorthTeam,
      ...matchRest
    } = match;
    const dateString = `${matchRest.startAt.substring(
      8,
      10
    )}/${matchRest.startAt.substring(5, 7)}`;

    if (!matchesGroupedByDate[dateString]) {
      const date = new Date(matchRest.startAt);
      const weekday = date.getDay();

      matchesGroupedByDate[dateString] = {
        weekday,
        matches: [],
      };
    }

    const newMatch: MatchDTO = {
      ...matchRest,
      playerEast: formatTeamPlayerDTO(playerEastTeam, playerEast),
      playerSouth: formatTeamPlayerDTO(playerSouthTeam, playerSouth),
      playerWest: formatTeamPlayerDTO(playerWestTeam, playerWest),
      playerNorth: formatTeamPlayerDTO(playerNorthTeam, playerNorth),
      _order: ["playerEast", "playerSouth", "playerWest", "playerNorth"],
    };

    if (
      playerEast &&
      playerEastTeam &&
      playerSouth &&
      playerSouthTeam &&
      playerWest &&
      playerWestTeam &&
      playerNorth &&
      playerNorthTeam
    ) {
      // assume both player and placeholder team exist

      const playersMap: Record<
        string,
        "playerEast" | "playerSouth" | "playerWest" | "playerNorth"
      > = {
        [playerEast.team._id]: "playerEast",
        [playerSouth.team._id]: "playerSouth",
        [playerWest.team._id]: "playerWest",
        [playerNorth.team._id]: "playerNorth",
      };

      newMatch._order = [
        playersMap[playerEastTeam._id],
        playersMap[playerSouthTeam._id],
        playersMap[playerWestTeam._id],
        playersMap[playerNorthTeam._id],
      ];
    }

    matchesGroupedByDate[dateString].matches.push(newMatch);
  }

  const result = Object.entries(matchesGroupedByDate).map(([key, value]) => ({
    date: key,
    ...value,
  }));

  return result;
});

/**
 * @deprecated since story/semifinal. Use getMatchesGroupedByStageAndDate instead.
 */
export const getMatchesGroupedByDate = cache(
  async (
    startDate: string,
    endDate: string,
    options?: { withPlayerDetails?: boolean }
  ) => {
    const teamPlayerProjection = options?.withPlayerDetails
      ? `..., team->${TEAM_PROJECTION}, player->{${PLAYER_PROJECTION}}`
      : 'team->{_id, name, "squareLogoImage": squareLogoImage.asset->url, "color": color.hex}';
    const teamProjection = TEAM_PROJECTION;

    const scheduledMatches = await publicClient.fetch<Match[]>(
      `*[_type == "match" && !(_id in path("drafts.**")) && tournament._ref == "${process.env.SANITY_DEFAULT_TOURNAMENT_ID}" && startAt >= "${startDate}" && startAt < "${endDate}"] | order(startAt asc){ _id, name, playerEast->{${teamPlayerProjection}}, playerSouth->{${teamPlayerProjection}}, playerWest->{${teamPlayerProjection}}, playerNorth->{${teamPlayerProjection}}, playerEastTeam->${teamProjection}, playerSouthTeam->${teamProjection}, playerWestTeam->${teamProjection}, playerNorthTeam->${teamProjection}, startAt, youtubeUrl, bilibiliUrl, result}`
    );

    const matchesGroupedByDate: Record<
      string,
      { weekday: number; matches: MatchDTO[] }
    > = {};

    for (const match of scheduledMatches) {
      const {
        playerEast,
        playerEastTeam,
        playerSouth,
        playerSouthTeam,
        playerWest,
        playerWestTeam,
        playerNorth,
        playerNorthTeam,
        ...matchRest
      } = match;
      const dateString = matchRest.startAt.substring(0, 10);

      if (!matchesGroupedByDate[dateString]) {
        const date = new Date(matchRest.startAt);
        const weekday = date.getDay();

        matchesGroupedByDate[dateString] = {
          weekday,
          matches: [],
        };
      }

      const newMatch: MatchDTO = {
        ...matchRest,
        playerEast: formatTeamPlayerDTO(playerEastTeam, playerEast),
        playerSouth: formatTeamPlayerDTO(playerSouthTeam, playerSouth),
        playerWest: formatTeamPlayerDTO(playerWestTeam, playerWest),
        playerNorth: formatTeamPlayerDTO(playerNorthTeam, playerNorth),
        _order: ["playerEast", "playerSouth", "playerWest", "playerNorth"],
      };

      if (
        playerEast &&
        playerEastTeam &&
        playerSouth &&
        playerSouthTeam &&
        playerWest &&
        playerWestTeam &&
        playerNorth &&
        playerNorthTeam
      ) {
        // assume both player and placeholder team exist

        const playersMap: Record<
          string,
          "playerEast" | "playerSouth" | "playerWest" | "playerNorth"
        > = {
          [playerEast.team._id]: "playerEast",
          [playerSouth.team._id]: "playerSouth",
          [playerWest.team._id]: "playerWest",
          [playerNorth.team._id]: "playerNorth",
        };

        newMatch._order = [
          playersMap[playerEastTeam._id],
          playersMap[playerSouthTeam._id],
          playersMap[playerWestTeam._id],
          playersMap[playerNorthTeam._id],
        ];
      }

      matchesGroupedByDate[dateString].matches.push(newMatch);
    }

    const result = Object.entries(matchesGroupedByDate).map(([key, value]) => ({
      date: key,
      ...value,
    }));

    return result;
  }
);

export const getMatchesGroupedByStageAndDate = cache(
  async (
    stage: keyof typeof STAGES,
    startDate: string,
    endDate: string,
    options?: { withPlayerDetails?: boolean }
  ) => {
    const activeStage = STAGES[stage];
    const teamPlayerProjection = options?.withPlayerDetails
      ? `..., team->${TEAM_PROJECTION}, player->{${PLAYER_PROJECTION}}`
      : 'team->{_id, name, "squareLogoImage": squareLogoImage.asset->url, "color": color.hex}';
    const teamProjection = TEAM_PROJECTION;

    const scheduledMatches = await publicClient.fetch<Match[]>(
      `*[_type == "match" && !(_id in path("drafts.**")) && tournament._ref == "${activeStage.tournamentId}" && startAt >= "${startDate}" && startAt < "${endDate}"] | order(startAt asc){ _id, name, playerEast->{${teamPlayerProjection}}, playerSouth->{${teamPlayerProjection}}, playerWest->{${teamPlayerProjection}}, playerNorth->{${teamPlayerProjection}}, playerEastTeam->${teamProjection}, playerSouthTeam->${teamProjection}, playerWestTeam->${teamProjection}, playerNorthTeam->${teamProjection}, startAt, youtubeUrl, bilibiliUrl, result}`
    );

    const matchesGroupedByDate: Record<
      string,
      { weekday: number; matches: MatchDTO[] }
    > = {};

    for (const match of scheduledMatches) {
      const {
        playerEast,
        playerEastTeam,
        playerSouth,
        playerSouthTeam,
        playerWest,
        playerWestTeam,
        playerNorth,
        playerNorthTeam,
        ...matchRest
      } = match;
      const dateString = matchRest.startAt.substring(0, 10);

      if (!matchesGroupedByDate[dateString]) {
        const date = new Date(matchRest.startAt);
        const weekday = date.getDay();

        matchesGroupedByDate[dateString] = {
          weekday,
          matches: [],
        };
      }

      const newMatch: MatchDTO = {
        ...matchRest,
        playerEast: formatTeamPlayerDTO(playerEastTeam, playerEast),
        playerSouth: formatTeamPlayerDTO(playerSouthTeam, playerSouth),
        playerWest: formatTeamPlayerDTO(playerWestTeam, playerWest),
        playerNorth: formatTeamPlayerDTO(playerNorthTeam, playerNorth),
        _order: ["playerEast", "playerSouth", "playerWest", "playerNorth"],
      };

      if (
        playerEast &&
        playerEastTeam &&
        playerSouth &&
        playerSouthTeam &&
        playerWest &&
        playerWestTeam &&
        playerNorth &&
        playerNorthTeam
      ) {
        // assume both player and placeholder team exist

        const playersMap: Record<
          string,
          "playerEast" | "playerSouth" | "playerWest" | "playerNorth"
        > = {
          [playerEast.team._id]: "playerEast",
          [playerSouth.team._id]: "playerSouth",
          [playerWest.team._id]: "playerWest",
          [playerNorth.team._id]: "playerNorth",
        };

        newMatch._order = [
          playersMap[playerEastTeam._id],
          playersMap[playerSouthTeam._id],
          playersMap[playerWestTeam._id],
          playersMap[playerNorthTeam._id],
        ];
      }

      matchesGroupedByDate[dateString].matches.push(newMatch);
    }

    const result = Object.entries(matchesGroupedByDate).map(([key, value]) => ({
      date: key,
      ...value,
    }));

    return result;
  }
);

export type TeamPlayerDTO = {
  playerId: string;
  playerName: string;
  playerNickname: string;
  playerDesignation: string;
  playerPortraitImageUrl: string;
  playerIntroduction: string;
  playerFullname: string;
  teamId: string;
  teamName: string;
  teamSecondaryName: string;
  teamThirdName: string;
  teamFullname: string;
  color: string;
  teamLogoImageUrl: string;
  teamSlug: string;
  teamIntroduction: string;
};

export type MatchDTO = Omit<
  Match,
  | "playerEast"
  | "playerSouth"
  | "playerWest"
  | "playerNorth"
  | "playerEastTeam"
  | "playerSouthTeam"
  | "playerWestTeam"
  | "playerNorthTeam"
> & {
  playerEast: TeamPlayerDTO;
  playerSouth: TeamPlayerDTO;
  playerWest: TeamPlayerDTO;
  playerNorth: TeamPlayerDTO;
  _order: ("playerEast" | "playerSouth" | "playerWest" | "playerNorth")[];
};

export const formatTeamPlayerDTO = (
  placeholderTeam: Team | null | undefined,
  teamPlayer?: TeamPlayer | null | undefined
): TeamPlayerDTO => {
  const newTeamPlayerDTO: TeamPlayerDTO = {
    playerId: "",
    playerName: "",
    playerNickname: "",
    playerDesignation: "",
    playerPortraitImageUrl:
      "https://hkleague2025.hkmahjong.org/images/empty.png",
    playerIntroduction: "",
    playerFullname: "",
    teamId: "",
    teamName: "",
    teamSecondaryName: "",
    teamThirdName: "",
    teamFullname: "",
    color: "#000000",
    teamLogoImageUrl: "https://hkleague2025.hkmahjong.org/images/empty.png",
    teamSlug: "",
    teamIntroduction: "",
  };

  if (teamPlayer) {
    if (teamPlayer.player) {
      newTeamPlayerDTO.playerName = teamPlayer.player.name;
      newTeamPlayerDTO.playerNickname = teamPlayer.player.nickname;
      newTeamPlayerDTO.playerDesignation = teamPlayer.player.name;
      newTeamPlayerDTO.playerPortraitImageUrl = teamPlayer.player.portraitImage;
      newTeamPlayerDTO.playerIntroduction = teamPlayer.introduction;
    }

    if (teamPlayer.team) {
      newTeamPlayerDTO.teamId = teamPlayer.team._id;
      newTeamPlayerDTO.teamName = teamPlayer.team.name;
      newTeamPlayerDTO.teamSecondaryName = teamPlayer.team.secondaryName;
      newTeamPlayerDTO.teamThirdName = teamPlayer.team.thirdName;
      newTeamPlayerDTO.color = teamPlayer.team.color;
      if (teamPlayer.team.squareLogoImage) {
        newTeamPlayerDTO.teamLogoImageUrl = teamPlayer.team.squareLogoImage;
      }
      newTeamPlayerDTO.teamSlug = teamPlayer.team.slug;
      newTeamPlayerDTO.teamIntroduction = teamPlayer.team.introduction;
    }

    if (teamPlayer.overridedDesignation) {
      newTeamPlayerDTO.playerDesignation = teamPlayer.overridedDesignation;
    }
    if (teamPlayer.overridedName) {
      newTeamPlayerDTO.playerName = teamPlayer.overridedName;
    }
    if (teamPlayer.overridedNickname) {
      newTeamPlayerDTO.playerNickname = teamPlayer.overridedNickname;
    }
    if (teamPlayer.overridedColor) {
      newTeamPlayerDTO.color = teamPlayer.overridedColor;
    }
    if (teamPlayer.overridedPortraitImage) {
      newTeamPlayerDTO.playerPortraitImageUrl =
        teamPlayer.overridedPortraitImage;
    }
  } else if (placeholderTeam) {
    newTeamPlayerDTO.teamId = placeholderTeam._id;
    newTeamPlayerDTO.teamName = placeholderTeam.name;
    newTeamPlayerDTO.teamSecondaryName = placeholderTeam.secondaryName;
    newTeamPlayerDTO.teamThirdName = placeholderTeam.thirdName;
    newTeamPlayerDTO.color = placeholderTeam.color;
    if (placeholderTeam.squareLogoImage) {
      newTeamPlayerDTO.teamLogoImageUrl = placeholderTeam.squareLogoImage;
    }
    newTeamPlayerDTO.teamSlug = placeholderTeam.slug;
    newTeamPlayerDTO.teamIntroduction = placeholderTeam.introduction;
  }

  newTeamPlayerDTO.playerFullname =
    newTeamPlayerDTO.playerName +
    (newTeamPlayerDTO.playerNickname
      ? ` (${newTeamPlayerDTO.playerNickname})`
      : "");
  newTeamPlayerDTO.teamFullname = [
    newTeamPlayerDTO.teamName,
    newTeamPlayerDTO.teamSecondaryName,
    newTeamPlayerDTO.teamThirdName,
  ]
    .filter((item) => !!item)
    .join(" ");

  return newTeamPlayerDTO;
};
