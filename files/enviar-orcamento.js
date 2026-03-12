// api/enviar-orcamento.js
// Vercel Serverless Function — executa no edge, sem Puppeteer.
// Busca o PDF do Supabase Storage e envia por e-mail via Nodemailer.

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { orcamentoId, clienteEmail, clienteNome, artistaNome, artistaEmail } = req.body;

  if (!orcamentoId || !clienteEmail) {
    return res.status(400).json({ erro: 'Dados obrigatórios ausentes' });
  }

  try {
    // 1. Busca a URL pública do PDF no Supabase Storage
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // service key para acessar storage privado
    );

    const { data: urlData } = supabase.storage
      .from('orcamentos')
      .getPublicUrl(`${orcamentoId}.pdf`);

    const pdfUrl = urlData?.publicUrl;

    // 2. Configura transporter SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailBase = {
      from: `"${artistaNome}" <${process.env.SMTP_USER}>`,
    };

    // 3. E-mail para o cliente com link do PDF
    await transporter.sendMail({
      ...mailBase,
      to: clienteEmail,
      subject: `Seu orçamento de ${artistaNome} está pronto ✨`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1C2331;">
          <div style="background: #1A3C6E; padding: 28px 32px;">
            <h1 style="color: white; margin: 0; font-size: 20px;">${artistaNome}</h1>
            <p style="color: #AECDE8; margin: 4px 0 0; font-size: 13px;">Proposta de Aquisição de Obra de Arte</p>
          </div>
          <div style="padding: 32px;">
            <p>Olá, <strong>${clienteNome}</strong>!</p>
            <p>Seu orçamento está pronto. Clique no botão abaixo para visualizar e baixar o PDF:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${pdfUrl}" target="_blank"
                style="background: #E8912D; color: white; padding: 12px 28px; border-radius: 100px;
                       text-decoration: none; font-weight: bold; font-size: 14px;">
                📄 Abrir Orçamento em PDF
              </a>
            </div>
            <p style="color: #888; font-size: 12px;">
              Este orçamento é válido por 15 dias. Em caso de dúvidas, responda este e-mail.
            </p>
          </div>
          <div style="background: #F5F7FA; padding: 16px 32px; font-size: 11px; color: #888;">
            ${artistaNome} · Orçamento gerado automaticamente
          </div>
        </div>
      `,
    });

    // 4. Cópia para a galeria/artista
    if (artistaEmail && artistaEmail !== process.env.SMTP_USER) {
      await transporter.sendMail({
        ...mailBase,
        to: artistaEmail,
        subject: `[Novo Orçamento] ${clienteNome} — ${new Date().toLocaleDateString('pt-BR')}`,
        html: `
          <p>Um novo orçamento foi solicitado por <strong>${clienteNome}</strong> (${clienteEmail}).</p>
          <p><a href="${pdfUrl}">Clique aqui para visualizar o PDF</a></p>
        `,
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[enviar-orcamento]', err);
    return res.status(500).json({ erro: 'Falha ao enviar e-mail', detalhe: err.message });
  }
};
