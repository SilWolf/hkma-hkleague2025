import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import React from "react";
import {
  MatchDTOForSocial,
  getMatchByDateAndIndex,
  getMatchByWeek,
} from "../..";
import { renderPoint, renderWeekday } from "@/helpers/string.helper";

export const dynamic = "force-dynamic";

const render = (matchGroups: Awaited<ReturnType<typeof getMatchByWeek>>) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background:
        "linear-gradient(to bottom, rgb(30, 34, 59), rgb(16, 18, 33))",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "stretch",
      fontFamily: "Noto Sans",
      fontWeight: 400,
      color: "#FFFFFF",
      fontSize: "16px",
      lineHeight: "1em",
      padding: "2em 4em 0 4em",
    }}
  >
    <div
      style={{
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src="https://hkleague2024.hkmahjong.org/images/logo.png"
          width={128}
          height={128}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Noto Serif",
              fontSize: "4em",
              marginLeft: "0.125em",
            }}
          >
            HK-League 2024
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "1.5em",
              marginLeft: ".3em",
              textShadow: "#00000080 0 0 1em, #00000080 0 0 0.5em",
            }}
          >
            香港麻雀協會
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "1.5em",
              marginLeft: ".3em",
              textShadow: "#00000080 0 0 1em, #00000080 0 0 0.5em",
            }}
          >
            香港立直麻雀團體聯賽2024
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1em",
          }}
        >
          <div
            style={{
              display: "flex",
            }}
          >
            主辦機構
          </div>
          <div
            style={{
              display: "flex",
            }}
          >
            <img
              src="https://hkleague2024.hkmahjong.org/images/logo-hkma.png"
              width={212}
              height={64}
              alt=""
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1em",
          }}
        >
          <div
            style={{
              display: "flex",
            }}
          >
            場地提供
          </div>
          <div
            style={{
              display: "flex",
            }}
          >
            <img
              src="https://hkleague2024.hkmahjong.org/images/logo-hkmjbs.png"
              width={155}
              height={64}
              alt=""
            />
          </div>
        </div>
      </div>
    </div>

    <div
      style={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        fontSize: "2em",
        fontWeight: 600,
        textAlign: "center",
        gap: ".5em",
      }}
    >
      {matchGroups.map(({ date, weekday, matches }) => (
        <div
          key={date}
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: ".5em",
            gap: ".5em",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              whiteSpace: "nowrap",
              flexDirection: "column",
              justifyContent: "center",
              marginLeft: ".5em",
              minWidth: "4.5em",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "1.5em",
                fontWeight: 600,
              }}
            >
              {date.substring(8, 10)}/{date.substring(5, 7)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "1em",
                fontWeight: 600,
              }}
            >
              ({renderWeekday(weekday)})
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
            }}
          >
            {matches[0]._order.map((playerIndex) => (
              <div
                key={playerIndex}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  alignItems: "center",
                  background: `linear-gradient(to bottom, transparent, ${matches[0][playerIndex].color}80)`,
                  filter:
                    matches[0].result &&
                    matches[0].result?.[playerIndex]?.ranking !== "1"
                      ? "grayscale(100%)"
                      : "",
                }}
              >
                <img
                  width={150}
                  height={150}
                  src={
                    matches[0][playerIndex].teamLogoImageUrl +
                    "?w=512&auto=format"
                  }
                  alt={matches[0][playerIndex].teamName}
                  style={{
                    opacity:
                      matches[0].result &&
                      matches[0].result?.[playerIndex]?.ranking !== "1"
                        ? 0.4
                        : 1,
                  }}
                />
                {matches[0].result && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      fontSize: ".75em",
                      marginTop: "-1em",
                    }}
                  >
                    {renderPoint(matches[0].result?.[playerIndex]?.point)}pt
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const GET = async (
  request: NextRequest,
  { params }: { params: { week: string } }
) => {
  try {
    const matchGroups = await getMatchByWeek(parseInt(params.week));

    console.log(matchGroups);

    const [
      NotoSansRegular,
      NotoSansSemiBold,
      NotoSerifSemiBold,
      KdamThmorProRegular,
    ] = await Promise.all([
      fetch(
        "https://hkleague2024.hkmahjong.org/fonts/NotoSansTC-Regular.ttf"
      ).then((res) => res.arrayBuffer()),
      fetch(
        `https://hkleague2024.hkmahjong.org/fonts/NotoSansTC-SemiBold.ttf`
      ).then((res) => res.arrayBuffer()),
      fetch(
        `https://hkleague2024.hkmahjong.org/fonts/NotoSerif-SemiBold.ttf`
      ).then((res) => res.arrayBuffer()),
      fetch(
        `https://hkleague2024.hkmahjong.org/fonts/KdamThmorPro-Regular.ttf`
      ).then((res) => res.arrayBuffer()),
    ]);

    return new ImageResponse(render(matchGroups), {
      width: 1280,
      height: 720,
      fonts: [
        {
          name: "Noto Sans",
          data: NotoSansRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Noto Sans",
          data: NotoSansSemiBold,
          weight: 600,
          style: "normal",
        },
        {
          name: "Noto Serif",
          data: NotoSerifSemiBold,
          weight: 600,
          style: "normal",
        },
        {
          name: "Kdam Thmor Pro",
          data: KdamThmorProRegular,
          weight: 400,
          style: "normal",
        },
      ],
      debug: false,
      status: 200,
    });
  } catch (e) {
    return Response.json({
      success: false,
      error: e,
    });
  }
};