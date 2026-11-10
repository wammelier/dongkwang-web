// 절기 배너 문구 (assets/절기별-배너/배너-데이터.js 기준). 메인 배너는 이미지 없이 문구만 쓴다.
// 3단계 이후 main_banners 테이블로 이동.
import type { SeasonKey } from "./season";

export type BannerContent = {
  name: string;
  title: string;
  description: string;
};

export const banners: Record<SeasonKey, BannerContent> = {
  advent: {
    name: "대림절",
    title: "소망으로\n기다리는 시간",
    description: "오실 주님을 기다리며, 우리의 마음에 소망의 빛을 밝힙니다.",
  },
  christmas: {
    name: "성탄절",
    title: "우리 가운데\n오신 예수님",
    description: "가장 낮은 곳으로 오신 사랑을 함께 기뻐합니다.",
  },
  epiphany: {
    name: "주현절",
    title: "빛으로 오신\n주님을 따라",
    description: "우리를 비추는 그 빛을 따라 믿음의 길을 걷습니다.",
  },
  lent: {
    name: "사순절",
    title: "주님의\n걸음을 따라",
    description: "기도와 묵상으로 주님의 사랑을 깊이 새깁니다.",
  },
  "palm-sunday": {
    name: "종려주일",
    title: "호산나,\n주님을 맞이합니다",
    description: "기쁨과 찬양으로 우리에게 오시는 주님을 맞이합니다.",
  },
  "holy-week": {
    name: "고난주간",
    title: "우리를 위해\n내어주신 사랑",
    description: "섬김과 나눔으로 주님의 사랑을 기억합니다.",
  },
  easter: {
    name: "부활절",
    title: "다시 사신 주님,\n새로운 소망",
    description: "부활의 기쁨으로 오늘을 새롭게 살아갑니다.",
  },
  pentecost: {
    name: "성령강림절",
    title: "성령 안에서\n함께 세워집니다",
    description: "서로를 세우며 사랑을 실천하는 공동체가 됩니다.",
  },
  ordinary: {
    name: "연중",
    title: "사랑과 나눔을\n배우고 실천합니다",
    description: "예수님의 사랑을 배우고 이웃과 함께 나눕니다.",
  },
  thanksgiving: {
    name: "추수감사절",
    title: "받은 은혜를 감사로,\n이웃에게",
    description: "한 해의 은혜를 기억하고 감사의 열매를 함께 나눕니다.",
  },
};
