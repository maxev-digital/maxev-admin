import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function nextBusinessDay() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function firstOfNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body   = await req.json();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const packageTier = (body.packageTier ?? 'PRO') as
    'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';
  const setupFee = parseFloat(body.setupFee)  || 0;
  const monthly  = parseFloat(body.monthly)   || 0;

  try {
    // 1. Client
    const client = await prisma.client.create({
      data: {
        businessName: lead.businessName,
        contactName:  lead.contactName,
        email:        lead.email,
        phone:        lead.phone,
        industry:     lead.industry,
        city:         lead.city,
        state:        lead.state ?? 'TX',
        packageTier,
        mrr:          monthly,
        launchDate:   new Date(),
        notes:        lead.notes,
      },
    });

    // 2. Invoice (setup fee, PENDING — owner will mark paid after collection)
    let invoice = null;
    if (setupFee > 0) {
      const invNum = `INV-${new Date().getFullYear()}-${client.id.slice(0, 6).toUpperCase()}`;
      invoice = await prisma.invoice.create({
        data: {
          clientId:      client.id,
          invoiceNumber: invNum,
          type:          'FINAL',
          amount:        setupFee,
          status:        'PENDING',
          dueDate:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lineItems:     [{ name: 'Security System Installation', price: setupFee }],
          notes:         'Setup fee — converted from pipeline lead',
        },
      });
    }

    // 3. Recurring billing
    let billing = null;
    if (monthly > 0) {
      billing = await prisma.recurringBilling.create({
        data: {
          clientId:      client.id,
          amount:        monthly,
          cycle:         'MONTHLY',
          nextBillingAt: firstOfNextMonth(),
          isActive:      true,
          notes:         'Monthly monitoring — auto-created on lead conversion',
        },
      });
    }

    // 4. Appointment (next business day at 9am)
    const svc        = await prisma.bookingService.findFirst({ where: { isActive: true } });
    const staffMember= await prisma.staff.findFirst({ where: { isActive: true } });
    const apptStart  = nextBusinessDay();

    const appointment = await prisma.appointment.create({
      data: {
        patientName:  lead.contactName ?? lead.businessName,
        patientEmail: lead.email,
        patientPhone: lead.phone,
        serviceId:    svc?.id        ?? null,
        staffId:      staffMember?.id ?? null,
        startTime:    apptStart,
        durationMin:  180,
        status:       'CONFIRMED',
        notes:        'Installation appointment — auto-created on lead conversion',
      },
    });

    // 5. Activity log
    const activities = [
      { type: 'client_created',        desc: `Lead converted to active client — ${lead.businessName}` },
      { type: 'invoice_created',       desc: setupFee > 0 ? `Setup invoice created — $${setupFee.toLocaleString()}` : 'No setup fee charged' },
      { type: 'billing_activated',     desc: monthly  > 0 ? `Monthly billing activated — $${monthly}/mo` : 'No recurring billing' },
      { type: 'appointment_scheduled', desc: `Installation appointment: ${apptStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at 9:00 AM` },
    ];
    for (const act of activities) {
      await prisma.activityLog.create({
        data: { clientId: client.id, leadId: lead.id, type: act.type, description: act.desc },
      });
    }

    // 6. Advance lead to ON_RETAINER
    await prisma.lead.update({ where: { id }, data: { stage: 'ON_RETAINER' } });

    return NextResponse.json({
      success:         true,
      clientId:        client.id,
      invoiceId:       invoice?.id   ?? null,
      billingId:       billing?.id   ?? null,
      appointmentId:   appointment.id,
      appointmentDate: apptStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[convert-lead]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
