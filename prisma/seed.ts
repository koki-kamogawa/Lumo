import {
  AdviceIntensity,
  GoalMode,
  MemoryMode,
  MemoryStatus,
  PrismaClient,
  ProposalStatus,
  ResponseStyle,
  SourceMode,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.shareCard.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.memoryProposal.deleteMany();
  await prisma.memoryEvidenceLink.deleteMany();
  await prisma.memoryItem.deleteMany();
  await prisma.analysisResult.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.entryAudio.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "demo@lumo.app",
      name: "Lumo Demo",
      settings: {
        create: {
          responseStyle: ResponseStyle.EMPATHETIC,
          purpose: GoalMode.SELF_UNDERSTANDING,
          adviceIntensity: AdviceIntensity.MEDIUM,
          memoryMode: MemoryMode.APPROVAL,
          shareByDefault: false,
          reminderFrequency: "weekday",
          reminderTime: "21:00",
        },
      },
    },
  });

  const entries = await Promise.all([
    prisma.entry.create({
      data: {
        userId: user.id,
        title: "仕事で褒められたけど実感がない",
        note: "メモ: 期待に応えたい気持ちはある",
        occurredAt: new Date("2026-03-02T21:10:00+09:00"),
        transcript: {
          create: {
            source: "dummy-transcriber",
            confidence: 0.86,
            content:
              "今日は会議で褒められたけど、なぜか素直に受け取れなかった。嬉しいのに、また次もできるか不安になってしまった。",
          },
        },
        analysis: {
          create: {
            summaryFacts:
              "会議で評価された一日でした。\nうれしさと同時に、次も応えられるか不安が残っています。",
            emotionTopJson: JSON.stringify([
              { label: "不安", score: 0.58 },
              { label: "嬉しさ", score: 0.42 },
            ]),
            energyPeakQuote: "嬉しいのに、また次もできるか不安になってしまった。",
            followupQuestion: "その評価を少しだけ信じるなら、何を認めてみたい？",
            weekHintLine: "今週は『認められること』に喜びと緊張が同時に出ています。",
            praiseLine: "不安をごまかさず言葉にできたのは、もう十分に誠実です。",
            praiseEvidenceQuote: "嬉しいのに、また次もできるか不安になってしまった。",
            microBadge: "TALKED",
            nextTeaser: "次は、評価された場面で体がどう反応したかも一緒に見てみよう。",
          },
        },
      },
    }),
    prisma.entry.create({
      data: {
        userId: user.id,
        title: "友人と話して気持ちが軽くなった",
        occurredAt: new Date("2026-03-01T20:10:00+09:00"),
        transcript: {
          create: {
            source: "dummy-transcriber",
            confidence: 0.83,
            content:
              "夜に友人と話したら、自分が思っていたより張りつめていたことに気づいた。話し終わった後は少し安心した。",
          },
        },
        analysis: {
          create: {
            summaryFacts:
              "友人との会話で緊張がほどけました。\n安心感と感謝が前に出ています。",
            emotionTopJson: JSON.stringify([
              { label: "安心", score: 0.64 },
              { label: "感謝", score: 0.36 },
            ]),
            energyPeakQuote: "話し終わった後は少し安心した。",
            followupQuestion: "その安心は、どんな言葉や空気から生まれていましたか？",
            weekHintLine: "人と話すことが回復のきっかけになっています。",
            praiseLine: "助けになった時間をちゃんと受け取れているのがいい流れです。",
            praiseEvidenceQuote: "話し終わった後は少し安心した。",
            microBadge: "CONTINUED",
            nextTeaser: "次は、自分ひとりで安心を作れる瞬間も探せそうです。",
          },
        },
      },
    }),
    prisma.entry.create({
      data: {
        userId: user.id,
        title: "やることが多くて呼吸が浅い",
        occurredAt: new Date("2026-02-28T22:15:00+09:00"),
        transcript: {
          create: {
            source: "dummy-transcriber",
            confidence: 0.8,
            content:
              "締め切りが重なって、ずっと呼吸が浅い感じがした。休んでいいのに、自分だけ止まれない気がして焦った。",
          },
        },
        analysis: {
          create: {
            summaryFacts:
              "締め切りの重なりで負荷が上がっています。\n休める状況でも、心は止まりづらいままです。",
            emotionTopJson: JSON.stringify([
              { label: "焦り", score: 0.6 },
              { label: "疲れ", score: 0.4 },
            ]),
            energyPeakQuote: "自分だけ止まれない気がして焦った。",
            followupQuestion: "止まれない感じが出るのは、どんな場面が多いですか？",
            weekHintLine: "今週は責任感が強いぶん、体の緊張が抜けづらいようです。",
            praiseLine: "張りつめた体の変化に気づけているのは大事な観察です。",
            praiseEvidenceQuote: "ずっと呼吸が浅い感じがした。",
            microBadge: "PATTERN_FOUND",
            nextTeaser: "次は、少しだけ緩んだ瞬間があったかを見つけてみよう。",
          },
        },
      },
    }),
    prisma.entry.create({
      data: {
        userId: user.id,
        title: "朝の散歩で少し整った",
        occurredAt: new Date("2026-02-27T08:30:00+09:00"),
        transcript: {
          create: {
            source: "dummy-transcriber",
            confidence: 0.78,
            content:
              "朝に少しだけ散歩した。劇的ではないけど、頭のざわつきが少し落ち着いて、そのまま仕事に入りやすかった。",
          },
        },
      },
    }),
  ]);

  const memoryItem1 = await prisma.memoryItem.create({
    data: {
      userId: user.id,
      category: "安心のきっかけ",
      memoryText: "友人と落ち着いて話せると、緊張がやわらぎやすい。",
      confidence: 0.81,
      stability: 0.73,
      sensitivity: "LOW",
      status: MemoryStatus.ACTIVE,
      sourceMode: SourceMode.APPROVAL,
    },
  });

  await prisma.memoryEvidenceLink.create({
    data: {
      memoryItemId: memoryItem1.id,
      entryId: entries[1].id,
      quote: "話し終わった後は少し安心した。",
    },
  });

  const memoryItem2 = await prisma.memoryItem.create({
    data: {
      userId: user.id,
      category: "繰り返しパターン",
      memoryText: "評価されると、喜びより先に次への不安が出やすい。",
      confidence: 0.76,
      stability: 0.67,
      sensitivity: "MEDIUM",
      status: MemoryStatus.ACTIVE,
      sourceMode: SourceMode.AUTO,
    },
  });

  await prisma.memoryEvidenceLink.create({
    data: {
      memoryItemId: memoryItem2.id,
      entryId: entries[0].id,
      quote: "嬉しいのに、また次もできるか不安になってしまった。",
    },
  });

  const memoryItem3 = await prisma.memoryItem.create({
    data: {
      userId: user.id,
      category: "Archived",
      memoryText: "朝の散歩は心のざわつきを少し整える。",
      confidence: 0.64,
      stability: 0.51,
      sensitivity: "LOW",
      status: MemoryStatus.ARCHIVED,
      sourceMode: SourceMode.AUTO,
      archivedAt: new Date("2026-03-03T09:00:00+09:00"),
    },
  });

  await prisma.memoryEvidenceLink.create({
    data: {
      memoryItemId: memoryItem3.id,
      entryId: entries[3].id,
      quote: "頭のざわつきが少し落ち着いて、そのまま仕事に入りやすかった。",
    },
  });

  await prisma.memoryProposal.create({
    data: {
      userId: user.id,
      entryId: entries[0].id,
      status: ProposalStatus.PENDING,
      proposedItemsJson: JSON.stringify([
        {
          memory_text: "会議で認められても、次の期待に意識が向きやすい。",
          confidence: 0.68,
          stability: 0.61,
          sensitivity: "MEDIUM",
          evidence_quote: "嬉しいのに、また次もできるか不安になってしまった。",
        },
        {
          memory_text: "不安をごまかさず言葉にできる誠実さがある。",
          confidence: 0.71,
          stability: 0.56,
          sensitivity: "LOW",
          evidence_quote: "素直に受け取れなかった。",
        },
      ]),
    },
  });

  const weeklyReport = await prisma.weeklyReport.create({
    data: {
      userId: user.id,
      weekStart: new Date("2026-02-24T00:00:00+09:00"),
      weekEnd: new Date("2026-03-02T23:59:59+09:00"),
      emotionFlowJson: JSON.stringify([
        { day: "Mon", value: 52 },
        { day: "Tue", value: 46 },
        { day: "Wed", value: 61 },
        { day: "Thu", value: 58 },
        { day: "Fri", value: 39 },
        { day: "Sat", value: 71 },
        { day: "Sun", value: 63 },
      ]),
      themeTagsJson: JSON.stringify(["評価", "友人", "休息", "責任感"]),
      changeSummary: "先週より、人に話した後の回復感を自覚しやすくなっています。",
      loopSummary: "比較から焦りに入るより先に、体の緊張へ気づく流れが増えています。",
      recoveryListJson: JSON.stringify(["友人との会話", "朝の散歩", "会議後に一呼吸置く"]),
      shareLine: "今週は『認められる嬉しさ』と『次への緊張』が同時に現れていました。",
    },
  });

  await prisma.shareCard.create({
    data: {
      userId: user.id,
      entryId: entries[0].id,
      maskedQuote: "認められても、次の期待に意識が向きやすい週。",
      emotionTagsJson: JSON.stringify(["不安", "嬉しさ"]),
    },
  });

  await prisma.shareCard.create({
    data: {
      userId: user.id,
      weeklyReportId: weeklyReport.id,
      maskedQuote: "今週は認められる喜びと緊張が同時に出ていました。",
      emotionTagsJson: JSON.stringify(["安心", "焦り"]),
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
