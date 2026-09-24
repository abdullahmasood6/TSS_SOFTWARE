import { PrismaClient, Role, EnquiryStatus, PriceHistoryType, DocumentEventType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.documentEvent.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.supplierInvoiceLine.deleteMany();
  await prisma.supplierInvoice.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.port.deleteMany();
  await prisma.enquiryTemplateLine.deleteMany();
  await prisma.enquiryTemplate.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.supplierPurchaseLine.deleteMany();
  await prisma.supplierPurchase.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.customerQuoteLine.deleteMany();
  await prisma.customerQuote.deleteMany();
  await prisma.supplierQuoteLine.deleteMany();
  await prisma.supplierQuote.deleteMany();
  await prisma.supplierRfqLine.deleteMany();
  await prisma.supplierRfq.deleteMany();
  await prisma.enquiryLine.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.vessel.deleteMany();
  await prisma.part.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySettings.deleteMany();

  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 8) {
    throw new Error("Set SEED_PASSWORD (min 8 chars) in .env before seeding.");
  }
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@northwharf.example",
      name: "Northwharf Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: "sales@northwharf.example",
      name: "Aya Sales",
      passwordHash,
      role: Role.SALES,
    },
  });

  const procurement = await prisma.user.create({
    data: {
      email: "procurement@northwharf.example",
      name: "Ken Procurement",
      passwordHash,
      role: Role.PROCUREMENT,
    },
  });

  await prisma.user.create({
    data: {
      email: "viewer@northwharf.example",
      name: "Viewer User",
      passwordHash,
      role: Role.VIEWER,
    },
  });

  await prisma.user.create({
    data: {
      email: "ops@northwharf.example",
      name: "Mika Operations",
      passwordHash,
      role: Role.SALES,
    },
  });

  const [cusPacific, cusNippon, cusHelios, cusSkagen, cusCoral, cusHarbor] =
    await Promise.all([
      prisma.customer.create({
        data: {
          code: "CUS-001",
          name: "Pacific Fleet Management",
          contact: "Capt. Rivera",
          email: "procurement@pacificfleet.example",
          phone: "+65-6555-0100",
          country: "Singapore",
          address: "12 Harbour Front Ave, Singapore",
        },
      }),
      prisma.customer.create({
        data: {
          code: "CUS-002",
          name: "Nippon Bulk Carriers",
          contact: "Ms. Tanaka",
          email: "spares@nbc.example",
          phone: "+81-3-5555-2200",
          country: "Japan",
          address: "3-8 Minato-ku, Tokyo",
        },
      }),
      prisma.customer.create({
        data: {
          code: "CUS-003",
          name: "Helios Fleet Management B.V.",
          contact: "Sophie van Dijk",
          email: "tech@heliosfleet.example",
          phone: "+31-10-555-2200",
          country: "Netherlands",
          address: "Wilhelminakade 123, Rotterdam",
        },
      }),
      prisma.customer.create({
        data: {
          code: "CUS-004",
          name: "Skagen Shipmanagement AB",
          contact: "Erik Johansson",
          email: "buying@skagenship.example",
          country: "Sweden",
          address: "Port of Gothenburg",
        },
      }),
      prisma.customer.create({
        data: {
          code: "CUS-005",
          name: "Coral Blue Tankers Pte Ltd",
          contact: "Priya Nair",
          email: "spares@coralbluetankers.example",
          country: "Singapore",
        },
      }),
      prisma.customer.create({
        data: {
          code: "CUS-006",
          name: "Harbor Line Shipmanagement",
          contact: "James Cole",
          email: "ops@harborline.example",
          phone: "+44-20-7946-0100",
          country: "United Kingdom",
          address: "Canary Wharf, London",
        },
      }),
    ]);

  const [portSg, portRtm, portHam, portBusan] = await Promise.all([
    prisma.port.create({
      data: { code: "SGSIN", name: "Singapore", country: "Singapore", region: "Asia" },
    }),
    prisma.port.create({
      data: { code: "NLRTM", name: "Rotterdam", country: "Netherlands", region: "Europe" },
    }),
    prisma.port.create({
      data: { code: "DEHAM", name: "Hamburg", country: "Germany", region: "Europe" },
    }),
    prisma.port.create({
      data: { code: "KRPUS", name: "Busan", country: "South Korea", region: "Asia" },
    }),
  ]);

  const [supYanmar, supEuro, supWartsila, supKorea, supMan, supService] = await Promise.all([
    prisma.supplier.create({
      data: {
        code: "SUP-001",
        name: "Yanmar Marine Parts Co.",
        contact: "Mr. Sato",
        email: "sales@yanmar-parts.example",
        country: "Japan",
        leadTimeDays: 14,
        brandsServed: "Yanmar",
        categories: "Engine, Filter",
        portsServed: "Tokyo, Yokohama, Singapore",
        kind: "SUPPLIER",
        kycStatus: "CLEAR",
        kycCheckedAt: new Date("2026-01-15"),
        paymentTermsDays: 30,
        ratingScore: 8.5,
        bankName: "MUFG",
        bankAccountRef: "JP-YAN-001",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-002",
        name: "EuroMarine Spares GmbH",
        contact: "Hans Mueller",
        email: "quotes@euromarine.example",
        country: "Germany",
        leadTimeDays: 21,
        brandsServed: "MAN, Alfa Laval, Fleetguard",
        categories: "Engine, Cooling, Filter",
        portsServed: "Hamburg, Rotterdam",
        kind: "SUPPLIER",
        kycStatus: "CLEAR",
        kycCheckedAt: new Date("2026-02-01"),
        paymentTermsDays: 45,
        ratingScore: 7.8,
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-003",
        name: "Wärtsilä Spare Hub",
        contact: "Anna Virtanen",
        email: "spares@wartsila-hub.example",
        country: "Finland",
        leadTimeDays: 18,
        brandsServed: "Wärtsilä",
        categories: "Engine, Electrical",
        portsServed: "Helsinki, Rotterdam, Singapore",
        kind: "SUPPLIER",
        kycStatus: "REVIEW",
        paymentTermsDays: 30,
        ratingScore: 8.1,
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-004",
        name: "Korea Marine Components",
        contact: "Park Ji-hoon",
        email: "export@kmc.example",
        country: "South Korea",
        leadTimeDays: 12,
        brandsServed: "Shinko, Gates, MG Duff",
        categories: "Pump, Piping, Hull",
        portsServed: "Busan, Singapore",
        kind: "SUPPLIER",
        kycStatus: "CLEAR",
        paymentTermsDays: 30,
        ratingScore: 7.2,
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-005",
        name: "MAN Energy Aftermarket",
        contact: "Lukas Weber",
        email: "aftermarket@man-energy.example",
        country: "Germany",
        leadTimeDays: 25,
        brandsServed: "MAN",
        categories: "Engine",
        portsServed: "Hamburg, Singapore, Rotterdam",
        kind: "SUPPLIER",
        kycStatus: "PENDING",
        paymentTermsDays: 60,
        ratingScore: 8.9,
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SVC-001",
        name: "Harbourline Technical Services",
        contact: "Mei Tan",
        email: "ops@harbourline-tech.example",
        country: "Singapore",
        leadTimeDays: 5,
        brandsServed: "Multi-brand",
        categories: "Repair, Service, Drydock",
        portsServed: "Singapore, Busan",
        kind: "SERVICE_PROVIDER",
        kycStatus: "CLEAR",
        paymentTermsDays: 15,
        ratingScore: 8.0,
      },
    }),
  ]);

  const partsData = [
    {
      partNumber: "1234",
      description: "Main Engine Fuel Injector Assembly",
      manufacturer: "Yanmar",
      brand: "Yanmar",
      impaCode: "591501",
      category: "Engine",
    },
    {
      partNumber: "PUMP-550",
      description: "Ballast Water Pump Impeller",
      manufacturer: "Shinko",
      brand: "Shinko",
      impaCode: "613201",
      category: "Pump",
    },
    {
      partNumber: "FLT-220",
      description: "Lube Oil Filter Element",
      manufacturer: "Fleetguard",
      brand: "Fleetguard",
      impaCode: "552101",
      category: "Filter",
    },
    {
      partNumber: "GASK-88",
      description: "Cylinder Head Gasket Set",
      manufacturer: "Yanmar",
      brand: "Yanmar",
      impaCode: "591215",
      category: "Engine",
    },
    {
      partNumber: "BRG-4410",
      description: "Main Bearing Shell Set",
      manufacturer: "MAN",
      brand: "MAN",
      impaCode: "591401",
      category: "Engine",
    },
    {
      partNumber: "SEAL-901",
      description: "Stern Tube Seal Ring",
      manufacturer: "Blohm+Voss",
      brand: "Blohm+Voss",
      impaCode: "650301",
      category: "Shaft",
    },
    {
      partNumber: "VALVE-330",
      description: "Exhaust Valve Spindle",
      manufacturer: "Wärtsilä",
      brand: "Wärtsilä",
      impaCode: "591601",
      category: "Engine",
    },
    {
      partNumber: "SENSOR-12",
      description: "Jacket Water Temperature Sensor",
      manufacturer: "Kongberg",
      brand: "Kongsberg",
      impaCode: "792501",
      category: "Electrical",
    },
    {
      partNumber: "HOSE-77",
      description: "Flexible Fuel Hose DN25",
      manufacturer: "Gates",
      brand: "Gates",
      impaCode: "371501",
      category: "Piping",
    },
    {
      partNumber: "ANOD-15",
      description: "Zinc Anode 5kg",
      manufacturer: "MG Duff",
      brand: "MG Duff",
      impaCode: "774501",
      category: "Hull",
    },
    {
      partNumber: "PIST-620",
      description: "Piston Crown Complete",
      manufacturer: "MAN",
      brand: "MAN",
      impaCode: "591301",
      category: "Engine",
    },
    {
      partNumber: "COOL-204",
      description: "Plate Heat Exchanger Gasket Kit",
      manufacturer: "Alfa Laval",
      brand: "Alfa Laval",
      impaCode: "592801",
      category: "Cooling",
    },
  ] as const;

  const parts = [];
  for (const p of partsData) {
    parts.push(
      await prisma.part.create({
        data: { ...p, unit: "EA" },
      })
    );
  }

  const byPn = Object.fromEntries(parts.map((p) => [p.partNumber, p]));

  await prisma.enquiryTemplate.create({
    data: {
      name: "Main engine overhaul kit",
      description: "Common MAN / Yanmar dry-dock injector & gasket set",
      category: "SPARES",
      createdById: sales.id,
      lines: {
        create: [
          {
            partId: byPn["1234"].id,
            partNumber: "1234",
            description: byPn["1234"].description,
            impaCode: byPn["1234"].impaCode,
            brand: byPn["1234"].brand,
            quantity: 4,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["GASK-88"].id,
            partNumber: "GASK-88",
            description: byPn["GASK-88"].description,
            impaCode: byPn["GASK-88"].impaCode,
            brand: byPn["GASK-88"].brand,
            quantity: 2,
            unit: "SET",
            sortOrder: 1,
          },
          {
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            impaCode: byPn["FLT-220"].impaCode,
            brand: byPn["FLT-220"].brand,
            quantity: 12,
            unit: "EA",
            sortOrder: 2,
          },
        ],
      },
    },
  });

  await prisma.enquiryTemplate.create({
    data: {
      name: "Hull & anode package",
      description: "Routine hull protection + stern seal",
      category: "STORES",
      createdById: sales.id,
      lines: {
        create: [
          {
            partId: byPn["ANOD-15"].id,
            partNumber: "ANOD-15",
            description: byPn["ANOD-15"].description,
            impaCode: byPn["ANOD-15"].impaCode,
            brand: byPn["ANOD-15"].brand,
            quantity: 20,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["SEAL-901"].id,
            partNumber: "SEAL-901",
            description: byPn["SEAL-901"].description,
            impaCode: byPn["SEAL-901"].impaCode,
            brand: byPn["SEAL-901"].brand,
            quantity: 1,
            unit: "EA",
            sortOrder: 1,
          },
        ],
      },
    },
  });


  const [vOceanStar, vCedarRidge, vSakura, vNordic, vAuroraWave, vThames, vFuji] =
    await Promise.all([
      prisma.vessel.create({
        data: {
          name: "MV Ocean Star",
          imo: "9123456",
          flag: "Singapore",
          vesselType: "Bulk Carrier",
          engineMake: "Yanmar",
          engineModel: "6EY26",
          customerId: cusPacific.id,
        },
      }),
      prisma.vessel.create({
        data: {
          name: "MT Cedar Ridge",
          imo: "9345678",
          flag: "Singapore",
          vesselType: "Oil Tanker",
          engineMake: "MAN",
          engineModel: "6S50ME",
          customerId: cusHelios.id,
        },
      }),
      prisma.vessel.create({
        data: {
          name: "MV Sakura Maru",
          imo: "9456789",
          flag: "Japan",
          vesselType: "General Cargo",
          engineMake: "Wärtsilä",
          engineModel: "6L46",
          customerId: cusNippon.id,
        },
      }),
      prisma.vessel.create({
        data: {
          name: "MV Nordic Wind",
          imo: "9567890",
          flag: "Sweden",
          vesselType: "Ro-Ro",
          engineMake: "MAN",
          engineModel: "7L32/40",
          customerId: cusSkagen.id,
        },
      }),
      prisma.vessel.create({
        data: {
          name: "MT Aurora Wave",
          imo: "9678901",
          flag: "Singapore",
          vesselType: "Chemical Tanker",
          engineMake: "MAN",
          engineModel: "6S60MC",
          customerId: cusCoral.id,
        },
      }),
      prisma.vessel.create({
        data: {
          name: "MV Thames Pride",
          imo: "9789012",
          flag: "United Kingdom",
          vesselType: "Container",
          engineMake: "Wärtsilä",
          engineModel: "8L46F",
          customerId: cusHarbor.id,
        },
      }),
      prisma.vessel.create({
        data: {
          name: "MV Fuji Path",
          imo: "9890123",
          flag: "Japan",
          vesselType: "Bulk Carrier",
          engineMake: "Yanmar",
          engineModel: "8N21",
          customerId: cusNippon.id,
        },
      }),
    ]);

  // Broad price history so catalog / warnings have depth
  const historyRows: {
    partNumber: string;
    type: PriceHistoryType;
    unitPrice: number;
    reference: string;
    recordedAt: string;
    customerId?: string;
    supplierId?: string;
    notes?: string;
  }[] = [
    {
      partNumber: "1234",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 10,
      reference: "NW-QT-2025-0042",
      recordedAt: "2025-11-12",
      customerId: cusPacific.id,
      notes: "Prior customer quote — do not undercut without reason",
    },
    {
      partNumber: "1234",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 11.5,
      reference: "NW-QT-2025-0051",
      recordedAt: "2025-12-03",
      customerId: cusNippon.id,
    },
    {
      partNumber: "1234",
      type: PriceHistoryType.SALE,
      unitPrice: 11.5,
      reference: "NW-PO-2025-0033",
      recordedAt: "2025-12-18",
      customerId: cusNippon.id,
    },
    {
      partNumber: "1234",
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: 6.5,
      reference: "Historical cost",
      recordedAt: "2025-11-10",
      supplierId: supYanmar.id,
    },
    {
      partNumber: "1234",
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: 7.1,
      reference: "YMP-Q-980",
      recordedAt: "2026-01-08",
      supplierId: supYanmar.id,
    },
    {
      partNumber: "PUMP-550",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 420,
      reference: "NW-QT-2025-0038",
      recordedAt: "2025-10-01",
      customerId: cusPacific.id,
    },
    {
      partNumber: "PUMP-550",
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: 295,
      reference: "EMS-701",
      recordedAt: "2025-09-28",
      supplierId: supEuro.id,
    },
    {
      partNumber: "FLT-220",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 28,
      reference: "NW-QT-2025-0040",
      recordedAt: "2025-10-15",
      customerId: cusHelios.id,
    },
    {
      partNumber: "FLT-220",
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: 18,
      reference: "KMC-441",
      recordedAt: "2025-10-12",
      supplierId: supKorea.id,
    },
    {
      partNumber: "GASK-88",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 165,
      reference: "NW-QT-2025-0045",
      recordedAt: "2025-11-20",
      customerId: cusSkagen.id,
    },
    {
      partNumber: "BRG-4410",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 980,
      reference: "NW-QT-2025-0048",
      recordedAt: "2025-12-01",
      customerId: cusCoral.id,
    },
    {
      partNumber: "BRG-4410",
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: 720,
      reference: "MAN-AF-220",
      recordedAt: "2025-11-28",
      supplierId: supMan.id,
    },
    {
      partNumber: "SEAL-901",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 2400,
      reference: "NW-QT-2025-0030",
      recordedAt: "2025-08-14",
      customerId: cusHarbor.id,
    },
    {
      partNumber: "VALVE-330",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 890,
      reference: "NW-QT-2025-0035",
      recordedAt: "2025-09-05",
      customerId: cusNippon.id,
    },
    {
      partNumber: "VALVE-330",
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: 640,
      reference: "WS-HUB-119",
      recordedAt: "2025-09-01",
      supplierId: supWartsila.id,
    },
    {
      partNumber: "SENSOR-12",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 145,
      reference: "NW-QT-2025-0049",
      recordedAt: "2025-12-10",
      customerId: cusHelios.id,
    },
    {
      partNumber: "ANOD-15",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 42,
      reference: "NW-QT-2025-0022",
      recordedAt: "2025-07-02",
      customerId: cusPacific.id,
    },
    {
      partNumber: "PIST-620",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 5200,
      reference: "NW-QT-2025-0055",
      recordedAt: "2026-01-15",
      customerId: cusCoral.id,
    },
    {
      partNumber: "COOL-204",
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: 310,
      reference: "NW-QT-2025-0041",
      recordedAt: "2025-10-22",
      customerId: cusSkagen.id,
    },
  ];

  for (const h of historyRows) {
    const part = byPn[h.partNumber];
    await prisma.priceHistory.create({
      data: {
        partId: part.id,
        partNumber: part.partNumber,
        description: part.description,
        type: h.type,
        unitPrice: h.unitPrice,
        currency: "USD",
        reference: h.reference,
        customerId: h.customerId,
        supplierId: h.supplierId,
        recordedAt: new Date(h.recordedAt),
        createdById: admin.id,
        notes: h.notes,
      },
    });
  }

  // ——— Enquiry 1: supplier quotes in (ready to build customer quote) ———
  const enq1 = await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0001",
      customerId: cusPacific.id,
      vesselId: vOceanStar.id,
      ownerId: sales.id,
      status: EnquiryStatus.SUPPLIER_QUOTES_RECEIVED,
      subject: "MV Ocean Star — Engine & pump spares",
      vesselName: "MV Ocean Star",
      category: "SPARES: Engine / Pump",
      priority: "URGENT",
      reference: "PFM-RFQ-8891",
      deliveryPort: "Singapore",
      notes: "Urgent dry-dock window in April.",
      dueDate: new Date("2026-03-20"),
      receivedAt: new Date("2026-03-01"),
      createdById: sales.id,
      updatedById: procurement.id,
      lines: {
        create: [
          {
            partId: byPn["1234"].id,
            partNumber: "1234",
            description: byPn["1234"].description,
            impaCode: byPn["1234"].impaCode,
            brand: byPn["1234"].brand,
            quantity: 4,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["PUMP-550"].id,
            partNumber: "PUMP-550",
            description: byPn["PUMP-550"].description,
            impaCode: byPn["PUMP-550"].impaCode,
            brand: byPn["PUMP-550"].brand,
            quantity: 1,
            unit: "EA",
            sortOrder: 1,
          },
          {
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            impaCode: byPn["FLT-220"].impaCode,
            brand: byPn["FLT-220"].brand,
            quantity: 12,
            unit: "EA",
            sortOrder: 2,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const e1Engine = enq1.lines.find((l) => l.partNumber === "1234")!;
  const e1Pump = enq1.lines.find((l) => l.partNumber === "PUMP-550")!;
  const e1Filter = enq1.lines.find((l) => l.partNumber === "FLT-220")!;

  const rfq1a = await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0001",
      enquiryId: enq1.id,
      supplierId: supYanmar.id,
      status: "QUOTED",
      sentAt: new Date("2026-03-02"),
      openedAt: new Date("2026-03-03"),
      respondedAt: new Date("2026-03-05"),
      dueAt: new Date("2026-03-07"),
      createdById: procurement.id,
      lines: {
        create: enq1.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  const rfq1b = await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0002",
      enquiryId: enq1.id,
      supplierId: supEuro.id,
      status: "QUOTED",
      sentAt: new Date("2026-03-02"),
      openedAt: new Date("2026-03-04"),
      respondedAt: new Date("2026-03-06"),
      dueAt: new Date("2026-03-07"),
      createdById: procurement.id,
      lines: {
        create: enq1.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  await prisma.supplierQuote.create({
    data: {
      number: "YMP-Q-1001",
      rfqId: rfq1a.id,
      supplierId: supYanmar.id,
      currency: "USD",
      leadTimeDays: 14,
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e1Engine.id,
            partId: byPn["1234"].id,
            partNumber: "1234",
            description: byPn["1234"].description,
            quantity: 4,
            unitCost: 7.25,
          },
          {
            enquiryLineId: e1Pump.id,
            partId: byPn["PUMP-550"].id,
            partNumber: "PUMP-550",
            description: byPn["PUMP-550"].description,
            quantity: 1,
            unitCost: 310,
          },
          {
            enquiryLineId: e1Filter.id,
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            quantity: 12,
            unitCost: 18.5,
          },
        ],
      },
    },
  });

  await prisma.supplierQuote.create({
    data: {
      number: "EMS-778",
      rfqId: rfq1b.id,
      supplierId: supEuro.id,
      currency: "USD",
      leadTimeDays: 21,
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e1Engine.id,
            partId: byPn["1234"].id,
            partNumber: "1234",
            description: byPn["1234"].description,
            quantity: 4,
            unitCost: 8.1,
          },
          {
            enquiryLineId: e1Pump.id,
            partId: byPn["PUMP-550"].id,
            partNumber: "PUMP-550",
            description: byPn["PUMP-550"].description,
            quantity: 1,
            unitCost: 295,
          },
          {
            enquiryLineId: e1Filter.id,
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            quantity: 12,
            unitCost: 21,
          },
        ],
      },
    },
  });

  // ——— Enquiry 2: newly received (no RFQs yet) ———
  await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0002",
      customerId: cusHelios.id,
      vesselId: vCedarRidge.id,
      ownerId: sales.id,
      status: EnquiryStatus.ENQUIRY_RECEIVED,
      subject: "MT Cedar Ridge — cooling & sensors",
      vesselName: "MT Cedar Ridge",
      category: "SPARES: Cooling / Sensors",
      priority: "NORMAL",
      reference: "GSS-ENQ-2210",
      notes: "Prefer OEM if lead time under 3 weeks.",
      dueDate: new Date("2026-03-28"),
      receivedAt: new Date("2026-03-12"),
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            partId: byPn["COOL-204"].id,
            partNumber: "COOL-204",
            description: byPn["COOL-204"].description,
            quantity: 2,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["SENSOR-12"].id,
            partNumber: "SENSOR-12",
            description: byPn["SENSOR-12"].description,
            quantity: 6,
            unit: "EA",
            sortOrder: 1,
          },
          {
            partId: byPn["HOSE-77"].id,
            partNumber: "HOSE-77",
            description: byPn["HOSE-77"].description,
            quantity: 10,
            unit: "EA",
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // ——— Enquiry 3: RFQs sent, awaiting supplier prices ———
  const enq3 = await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0003",
      customerId: cusNippon.id,
      vesselId: vSakura.id,
      ownerId: sales.id,
      status: EnquiryStatus.RFQ_SENT,
      subject: "MV Sakura Maru — exhaust valves",
      vesselName: "MV Sakura Maru",
      category: "SPARES: Exhaust",
      priority: "NORMAL",
      reference: "NBC-2603-14",
      dueDate: new Date("2026-03-25"),
      receivedAt: new Date("2026-03-05"),
      createdById: sales.id,
      updatedById: procurement.id,
      lines: {
        create: [
          {
            partId: byPn["VALVE-330"].id,
            partNumber: "VALVE-330",
            description: byPn["VALVE-330"].description,
            quantity: 4,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["GASK-88"].id,
            partNumber: "GASK-88",
            description: byPn["GASK-88"].description,
            quantity: 2,
            unit: "EA",
            sortOrder: 1,
          },
        ],
      },
    },
    include: { lines: true },
  });

  await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0003",
      enquiryId: enq3.id,
      supplierId: supWartsila.id,
      status: "SENT",
      createdById: procurement.id,
      lines: {
        create: enq3.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0004",
      enquiryId: enq3.id,
      supplierId: supMan.id,
      status: "SENT",
      createdById: procurement.id,
      lines: {
        create: enq3.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  // ——— Enquiry 4: quote awaiting approval ———
  const enq4 = await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0004",
      customerId: cusSkagen.id,
      vesselId: vNordic.id,
      ownerId: sales.id,
      status: EnquiryStatus.AWAITING_APPROVAL,
      subject: "MV Nordic Wind — anodes & seals",
      vesselName: "MV Nordic Wind",
      category: "SPARES: Hull / Seals",
      priority: "NORMAL",
      reference: "BMS-PO-PREP-09",
      receivedAt: new Date("2026-02-18"),
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            partId: byPn["ANOD-15"].id,
            partNumber: "ANOD-15",
            description: byPn["ANOD-15"].description,
            quantity: 20,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["SEAL-901"].id,
            partNumber: "SEAL-901",
            description: byPn["SEAL-901"].description,
            quantity: 1,
            unit: "EA",
            sortOrder: 1,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const e4Anod = enq4.lines.find((l) => l.partNumber === "ANOD-15")!;
  const e4Seal = enq4.lines.find((l) => l.partNumber === "SEAL-901")!;

  const rfq4 = await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0005",
      enquiryId: enq4.id,
      supplierId: supEuro.id,
      status: "QUOTED",
      createdById: procurement.id,
      lines: {
        create: enq4.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  await prisma.supplierQuote.create({
    data: {
      number: "EMS-812",
      rfqId: rfq4.id,
      supplierId: supEuro.id,
      currency: "USD",
      leadTimeDays: 16,
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e4Anod.id,
            partId: byPn["ANOD-15"].id,
            partNumber: "ANOD-15",
            description: byPn["ANOD-15"].description,
            quantity: 20,
            unitCost: 28,
          },
          {
            enquiryLineId: e4Seal.id,
            partId: byPn["SEAL-901"].id,
            partNumber: "SEAL-901",
            description: byPn["SEAL-901"].description,
            quantity: 1,
            unitCost: 1850,
          },
        ],
      },
    },
  });

  await prisma.customerQuote.create({
    data: {
      number: "NW-QT-2026-0001",
      enquiryId: enq4.id,
      customerId: cusSkagen.id,
      currency: "USD",
      marginPct: 18,
      status: "SENT",
      sentAt: new Date("2026-03-08"),
      notes: "Validity 14 days. Ex-works Tokyo.",
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            enquiryLineId: e4Anod.id,
            partId: byPn["ANOD-15"].id,
            partNumber: "ANOD-15",
            description: byPn["ANOD-15"].description,
            quantity: 20,
            unitCost: 28,
            unitSell: 45,
            previousSellPrice: 42,
            sortOrder: 0,
          },
          {
            enquiryLineId: e4Seal.id,
            partId: byPn["SEAL-901"].id,
            partNumber: "SEAL-901",
            description: byPn["SEAL-901"].description,
            quantity: 1,
            unitCost: 1850,
            unitSell: 2450,
            previousSellPrice: 2400,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.priceHistory.createMany({
    data: [
      {
        partId: byPn["ANOD-15"].id,
        partNumber: "ANOD-15",
        description: byPn["ANOD-15"].description,
        type: PriceHistoryType.CUSTOMER_QUOTE,
        unitPrice: 45,
        currency: "USD",
        quantity: 20,
        reference: "NW-QT-2026-0001",
        customerId: cusSkagen.id,
        enquiryId: enq4.id,
        createdById: sales.id,
        recordedAt: new Date("2026-03-08"),
      },
      {
        partId: byPn["SEAL-901"].id,
        partNumber: "SEAL-901",
        description: byPn["SEAL-901"].description,
        type: PriceHistoryType.CUSTOMER_QUOTE,
        unitPrice: 2450,
        currency: "USD",
        quantity: 1,
        reference: "NW-QT-2026-0001",
        customerId: cusSkagen.id,
        enquiryId: enq4.id,
        createdById: sales.id,
        recordedAt: new Date("2026-03-08"),
      },
    ],
  });

  // ——— Enquiry 5: completed purchase cycle ———
  const enq5 = await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0005",
      customerId: cusCoral.id,
      vesselId: vAuroraWave.id,
      ownerId: sales.id,
      status: EnquiryStatus.COMPLETED,
      subject: "MT Aurora Wave — main bearings",
      vesselName: "MT Aurora Wave",
      category: "SPARES: Main Engine",
      priority: "NORMAL",
      reference: "OT-PO-77821",
      receivedAt: new Date("2026-01-20"),
      createdById: sales.id,
      updatedById: procurement.id,
      lines: {
        create: [
          {
            partId: byPn["BRG-4410"].id,
            partNumber: "BRG-4410",
            description: byPn["BRG-4410"].description,
            quantity: 1,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["PIST-620"].id,
            partNumber: "PIST-620",
            description: byPn["PIST-620"].description,
            quantity: 1,
            unit: "EA",
            sortOrder: 1,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const e5Brg = enq5.lines.find((l) => l.partNumber === "BRG-4410")!;
  const e5Pist = enq5.lines.find((l) => l.partNumber === "PIST-620")!;

  const rfq5 = await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0006",
      enquiryId: enq5.id,
      supplierId: supMan.id,
      status: "QUOTED",
      createdById: procurement.id,
      lines: {
        create: enq5.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  await prisma.supplierQuote.create({
    data: {
      number: "MAN-Q-4401",
      rfqId: rfq5.id,
      supplierId: supMan.id,
      currency: "USD",
      leadTimeDays: 22,
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e5Brg.id,
            partId: byPn["BRG-4410"].id,
            partNumber: "BRG-4410",
            description: byPn["BRG-4410"].description,
            quantity: 1,
            unitCost: 740,
          },
          {
            enquiryLineId: e5Pist.id,
            partId: byPn["PIST-620"].id,
            partNumber: "PIST-620",
            description: byPn["PIST-620"].description,
            quantity: 1,
            unitCost: 4100,
          },
        ],
      },
    },
  });

  await prisma.customerQuote.create({
    data: {
      number: "NW-QT-2026-0002",
      enquiryId: enq5.id,
      customerId: cusCoral.id,
      currency: "USD",
      marginPct: 20,
      status: "APPROVED",
      sentAt: new Date("2026-02-02"),
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            enquiryLineId: e5Brg.id,
            partId: byPn["BRG-4410"].id,
            partNumber: "BRG-4410",
            description: byPn["BRG-4410"].description,
            quantity: 1,
            unitCost: 740,
            unitSell: 990,
            previousSellPrice: 980,
            sortOrder: 0,
          },
          {
            enquiryLineId: e5Pist.id,
            partId: byPn["PIST-620"].id,
            partNumber: "PIST-620",
            description: byPn["PIST-620"].description,
            quantity: 1,
            unitCost: 4100,
            unitSell: 5400,
            previousSellPrice: 5200,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      number: "NW-CPO-2026-0001",
      enquiryId: enq5.id,
      customerId: cusCoral.id,
      customerPoRef: "OT-PO-77821",
      receivedAt: new Date("2026-02-10"),
      notes: "Deliver to Singapore bonded warehouse.",
      createdById: sales.id,
    },
  });

  await prisma.supplierPurchase.create({
    data: {
      number: "NW-PO-2026-0001",
      enquiryId: enq5.id,
      supplierId: supMan.id,
      status: "CLOSED",
      sentAt: new Date("2026-02-12"),
      carrier: "Nippon Express",
      trackingNo: "NX-445201",
      deliveryPort: "Singapore",
      etd: new Date("2026-02-14"),
      eta: new Date("2026-02-25"),
      shippedAt: new Date("2026-02-14"),
      deliveredAt: new Date("2026-02-24"),
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e5Brg.id,
            partId: byPn["BRG-4410"].id,
            partNumber: "BRG-4410",
            description: byPn["BRG-4410"].description,
            quantity: 1,
            unitCost: 740,
          },
          {
            enquiryLineId: e5Pist.id,
            partId: byPn["PIST-620"].id,
            partNumber: "PIST-620",
            description: byPn["PIST-620"].description,
            quantity: 1,
            unitCost: 4100,
          },
        ],
      },
    },
  });

  await prisma.priceHistory.createMany({
    data: [
      {
        partId: byPn["BRG-4410"].id,
        partNumber: "BRG-4410",
        description: byPn["BRG-4410"].description,
        type: PriceHistoryType.SALE,
        unitPrice: 990,
        currency: "USD",
        quantity: 1,
        reference: "NW-QT-2026-0002",
        customerId: cusCoral.id,
        enquiryId: enq5.id,
        createdById: sales.id,
        recordedAt: new Date("2026-02-28"),
      },
      {
        partId: byPn["PIST-620"].id,
        partNumber: "PIST-620",
        description: byPn["PIST-620"].description,
        type: PriceHistoryType.SALE,
        unitPrice: 5400,
        currency: "USD",
        quantity: 1,
        reference: "NW-QT-2026-0002",
        customerId: cusCoral.id,
        enquiryId: enq5.id,
        createdById: sales.id,
        recordedAt: new Date("2026-02-28"),
      },
    ],
  });

  // ——— Enquiry 6: purchase sent (in progress) ———
  const enq6 = await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0006",
      customerId: cusHarbor.id,
      vesselId: vThames.id,
      ownerId: sales.id,
      status: EnquiryStatus.PURCHASE_SENT,
      subject: "MV Thames Pride — filters & hose",
      vesselName: "MV Thames Pride",
      category: "SPARES: Filters / Hose",
      priority: "NORMAL",
      reference: "HL-RFQ-552",
      receivedAt: new Date("2026-02-25"),
      createdById: sales.id,
      updatedById: procurement.id,
      lines: {
        create: [
          {
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            quantity: 24,
            unit: "EA",
            sortOrder: 0,
          },
          {
            partId: byPn["HOSE-77"].id,
            partNumber: "HOSE-77",
            description: byPn["HOSE-77"].description,
            quantity: 8,
            unit: "EA",
            sortOrder: 1,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const e6Flt = enq6.lines.find((l) => l.partNumber === "FLT-220")!;
  const e6Hose = enq6.lines.find((l) => l.partNumber === "HOSE-77")!;

  const rfq6 = await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0007",
      enquiryId: enq6.id,
      supplierId: supKorea.id,
      status: "QUOTED",
      createdById: procurement.id,
      lines: {
        create: enq6.lines.map((l) => ({
          enquiryLineId: l.id,
          quantity: l.quantity,
        })),
      },
    },
  });

  await prisma.supplierQuote.create({
    data: {
      number: "KMC-901",
      rfqId: rfq6.id,
      supplierId: supKorea.id,
      currency: "USD",
      leadTimeDays: 10,
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e6Flt.id,
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            quantity: 24,
            unitCost: 17.5,
          },
          {
            enquiryLineId: e6Hose.id,
            partId: byPn["HOSE-77"].id,
            partNumber: "HOSE-77",
            description: byPn["HOSE-77"].description,
            quantity: 8,
            unitCost: 36,
          },
        ],
      },
    },
  });

  await prisma.customerQuote.create({
    data: {
      number: "NW-QT-2026-0003",
      enquiryId: enq6.id,
      customerId: cusHarbor.id,
      currency: "USD",
      marginPct: 15,
      status: "APPROVED",
      sentAt: new Date("2026-03-01"),
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            enquiryLineId: e6Flt.id,
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            quantity: 24,
            unitCost: 17.5,
            unitSell: 29,
            previousSellPrice: 28,
            sortOrder: 0,
          },
          {
            enquiryLineId: e6Hose.id,
            partId: byPn["HOSE-77"].id,
            partNumber: "HOSE-77",
            description: byPn["HOSE-77"].description,
            quantity: 8,
            unitCost: 36,
            unitSell: 48,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      number: "NW-CPO-2026-0002",
      enquiryId: enq6.id,
      customerId: cusHarbor.id,
      customerPoRef: "HL-PO-10992",
      receivedAt: new Date("2026-03-05"),
      createdById: sales.id,
    },
  });

  const purchase2 = await prisma.supplierPurchase.create({
    data: {
      number: "NW-PO-2026-0002",
      enquiryId: enq6.id,
      supplierId: supKorea.id,
      status: "SHIPPED",
      sentAt: new Date("2026-03-06"),
      carrier: "DHL Global Forwarding",
      trackingNo: "DHL-778291004",
      deliveryPort: "Singapore",
      etd: new Date("2026-03-08"),
      eta: new Date("2026-03-18"),
      shippedAt: new Date("2026-03-08"),
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e6Flt.id,
            partId: byPn["FLT-220"].id,
            partNumber: "FLT-220",
            description: byPn["FLT-220"].description,
            quantity: 24,
            unitCost: 17.5,
          },
          {
            enquiryLineId: e6Hose.id,
            partId: byPn["HOSE-77"].id,
            partNumber: "HOSE-77",
            description: byPn["HOSE-77"].description,
            quantity: 8,
            unitCost: 36,
          },
        ],
      },
    },
    include: { lines: true },
  });

  // ——— Enquiry 7: rejected quote ———
  const enq7 = await prisma.enquiry.create({
    data: {
      number: "NW-ENQ-2026-0007",
      customerId: cusNippon.id,
      vesselId: vFuji.id,
      ownerId: sales.id,
      status: EnquiryStatus.REJECTED,
      subject: "MV Fuji Path — gasket trial order",
      vesselName: "MV Fuji Path",
      category: "SPARES: Gaskets",
      priority: "NORMAL",
      reference: "NBC-TRIAL-03",
      notes: "Customer chose local vendor after quote.",
      receivedAt: new Date("2026-02-01"),
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            partId: byPn["GASK-88"].id,
            partNumber: "GASK-88",
            description: byPn["GASK-88"].description,
            quantity: 5,
            unit: "EA",
            sortOrder: 0,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const e7Gask = enq7.lines[0]!;
  const rfq7 = await prisma.supplierRfq.create({
    data: {
      number: "NW-RFQ-2026-0008",
      enquiryId: enq7.id,
      supplierId: supYanmar.id,
      status: "QUOTED",
      createdById: procurement.id,
      lines: {
        create: [{ enquiryLineId: e7Gask.id, quantity: e7Gask.quantity }],
      },
    },
  });

  await prisma.supplierQuote.create({
    data: {
      number: "YMP-Q-988",
      rfqId: rfq7.id,
      supplierId: supYanmar.id,
      currency: "USD",
      leadTimeDays: 10,
      createdById: procurement.id,
      lines: {
        create: [
          {
            enquiryLineId: e7Gask.id,
            partId: byPn["GASK-88"].id,
            partNumber: "GASK-88",
            description: byPn["GASK-88"].description,
            quantity: 5,
            unitCost: 120,
          },
        ],
      },
    },
  });

  await prisma.customerQuote.create({
    data: {
      number: "NW-QT-2026-0004",
      enquiryId: enq7.id,
      customerId: cusNippon.id,
      currency: "USD",
      marginPct: 15,
      status: "REJECTED",
      sentAt: new Date("2026-02-08"),
      notes: "Lost to competitor on lead time.",
      createdById: sales.id,
      updatedById: sales.id,
      lines: {
        create: [
          {
            enquiryLineId: e7Gask.id,
            partId: byPn["GASK-88"].id,
            partNumber: "GASK-88",
            description: byPn["GASK-88"].description,
            quantity: 5,
            unitCost: 120,
            unitSell: 170,
            previousSellPrice: 165,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.companySettings.create({
    data: {
      companyName: "Northwharf",
      shortName: "NW",
      address: "Harbour Business Centre, Singapore",
      phone: "+81-3-0000-0000",
      email: "ops@northwharf.example",
      website: "https://northwharf.example",
      defaultCurrency: "USD",
      defaultMarginPct: 15,
      enqSeq: 7,
      rfqSeq: 8,
      quoteSeq: 4,
      poSeq: 2,
      purchaseSeq: 2,
      invoiceSeq: 1,
      receiptSeq: 1,
      paymentSeq: 1,
      contractSeq: 1,
    },
  });

  await prisma.contract.create({
    data: {
      number: "NW-CTR-2026-0001",
      title: "Singapore engine spares framework",
      supplierId: supYanmar.id,
      portId: portSg.id,
      portName: portSg.name,
      category: "Engine",
      status: "ACTIVE",
      isTender: false,
      currency: "USD",
      valueAmount: 250000,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      terms: "Preferred supplier for Yanmar engine parts calling Singapore.",
      createdById: admin.id,
    },
  });

  await prisma.contract.create({
    data: {
      number: "NW-CTR-2026-0002",
      title: "Rotterdam repair services tender",
      portId: portRtm.id,
      portName: portRtm.name,
      category: "Repair, Service",
      status: "OPEN",
      isTender: true,
      currency: "USD",
      terms: "Open tender for technical services at Rotterdam.",
      createdById: procurement.id,
    },
  });

  const receipt1 = await prisma.goodsReceipt.create({
    data: {
      number: "NW-GRN-2026-0001",
      purchaseId: purchase2.id,
      deliveryPort: "Singapore",
      receivedById: procurement.id,
      receivedAt: new Date("2026-03-19"),
      lines: {
        create: purchase2.lines.map((l) => ({
          purchaseLineId: l.id,
          partNumber: l.partNumber,
          description: l.description,
          orderedQty: l.quantity,
          receivedQty: l.quantity,
        })),
      },
    },
  });

  const invTotal = purchase2.lines.reduce(
    (s, l) => s + Number(l.quantity) * Number(l.unitCost),
    0
  );
  const invoice1 = await prisma.supplierInvoice.create({
    data: {
      number: "NW-INV-2026-0001",
      supplierId: supKorea.id,
      purchaseId: purchase2.id,
      receiptId: receipt1.id,
      supplierInvRef: "KMC-INV-8891",
      currency: "USD",
      invoiceDate: new Date("2026-03-20"),
      dueDate: new Date("2026-04-20"),
      subtotal: invTotal,
      taxAmount: 0,
      totalAmount: invTotal,
      matchStatus: "MATCHED",
      matchNotes: "PO, goods receipt, and invoice aligned",
      status: "OPEN",
      createdById: procurement.id,
      lines: {
        create: purchase2.lines.map((l) => ({
          partNumber: l.partNumber,
          description: l.description,
          quantity: l.quantity,
          unitCost: l.unitCost,
          amount: Number(l.quantity) * Number(l.unitCost),
        })),
      },
    },
  });

  await prisma.payment.create({
    data: {
      number: "NW-PAY-2026-0001",
      supplierId: supKorea.id,
      invoiceId: invoice1.id,
      purchaseId: purchase2.id,
      currency: "USD",
      amount: invTotal,
      status: "PENDING",
      method: "Wire",
      kycCleared: true,
      scheduledAt: new Date("2026-04-15"),
      createdById: admin.id,
    },
  });

  await prisma.supplierPurchase.update({
    where: { id: purchase2.id },
    data: { status: "RECEIVED", deliveredAt: new Date("2026-03-19") },
  });

  // keep ports referenced for catalogue completeness
  await prisma.port.update({ where: { id: portHam.id }, data: { active: true } });
  await prisma.port.update({ where: { id: portBusan.id }, data: { active: true } });
  await prisma.supplier.update({
    where: { id: supService.id },
    data: { notes: "Preferred technical service partner in Singapore" },
  });

  // Sample transaction-monitor events for enquiry 1
  await prisma.documentEvent.createMany({
    data: [
      {
        enquiryId: enq1.id,
        entityType: "Enquiry",
        entityId: enq1.id,
        type: DocumentEventType.CREATED,
        label: "Enquiry NW-ENQ-2026-0001 received",
        actorId: sales.id,
        occurredAt: new Date("2026-03-01T08:00:00Z"),
      },
      {
        enquiryId: enq1.id,
        entityType: "SupplierRfq",
        entityId: rfq1a.id,
        type: DocumentEventType.SENT,
        label: "RFQ NW-RFQ-2026-0001 sent to Yanmar Marine Parts Co.",
        actorId: procurement.id,
        occurredAt: new Date("2026-03-02T09:00:00Z"),
      },
      {
        enquiryId: enq1.id,
        entityType: "SupplierRfq",
        entityId: rfq1a.id,
        type: DocumentEventType.OPENED,
        label: "Yanmar Marine Parts Co. opened RFQ NW-RFQ-2026-0001",
        actorId: procurement.id,
        occurredAt: new Date("2026-03-03T11:20:00Z"),
      },
      {
        enquiryId: enq1.id,
        entityType: "SupplierQuote",
        entityId: rfq1a.id,
        type: DocumentEventType.RESPONDED,
        label: "Supplier quote received from Yanmar Marine Parts Co.",
        actorId: procurement.id,
        occurredAt: new Date("2026-03-05T14:00:00Z"),
      },
      {
        enquiryId: enq1.id,
        entityType: "Note",
        type: DocumentEventType.NOTE,
        label: "Customer confirmed Singapore delivery preferred",
        notes: "Bonded warehouse preferred if air freight.",
        actorId: sales.id,
        occurredAt: new Date("2026-03-06T10:00:00Z"),
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Staff accounts created (see your admin for credentials).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
