-- Script de Migração: Adiciona Faixa Etária e Ordenação Personalizada nas Turmas
ALTER TABLE dance_classes ADD COLUMN IF NOT EXISTS age_group VARCHAR(100);
ALTER TABLE dance_classes ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
