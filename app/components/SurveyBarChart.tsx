"use client";

import { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

type ChartItem = { label: string; count: number };

export function SurveyBarChart({ title, items, color = "#378fe7" }: { title: string; items: ChartItem[]; color?: string }) {
  const options = useMemo<Highcharts.Options>(() => ({
    chart: {
      type: "bar",
      height: Math.max(340, items.length * 52 + 120),
      backgroundColor: "transparent",
      spacing: [8, 12, 8, 8],
    },
    title: { text: undefined },
    credits: { enabled: false },
    accessibility: { enabled: true, description: title },
    xAxis: {
      categories: items.map((item) => item.label),
      lineColor: "#dce6f0",
      tickColor: "#dce6f0",
      labels: { style: { color: "#405a73", fontSize: "13px" } },
    },
    yAxis: {
      min: 0,
      allowDecimals: false,
      title: { text: undefined },
      gridLineColor: "#e7eef5",
      labels: { style: { color: "#6e8296", fontSize: "12px" } },
    },
    legend: { enabled: false },
    tooltip: {
      pointFormat: "<b>{point.y}</b> encuestas",
      backgroundColor: "#14263b",
      borderWidth: 0,
      style: { color: "#ffffff" },
    },
    plotOptions: {
      bar: {
        color,
        borderRadius: 5,
        pointPadding: 0.08,
        groupPadding: 0.08,
        minPointLength: 2,
        dataLabels: {
          enabled: true,
          inside: false,
          align: "left",
          crop: false,
          overflow: "allow",
          style: { color: "#14263b", fontSize: "13px", fontWeight: "700", textOutline: "none" },
        },
      },
    },
    series: [{
      type: "bar",
      name: "Encuestas",
      data: items.map((item) => item.count),
    }],
  }), [color, items, title]);

  return <div className="highcharts-wrap" aria-label={title}><HighchartsReact highcharts={Highcharts} options={options} /></div>;
}
