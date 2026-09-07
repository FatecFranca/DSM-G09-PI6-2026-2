using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Livros.Dados.Migracoes
{
    /// <inheritdoc />
    public partial class CriarLivrosSimilares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "livros_similares",
                columns: table => new
                {
                    id_livro = table.Column<long>(type: "bigint", nullable: false),
                    posicao = table.Column<short>(type: "smallint", nullable: false),
                    id_livro_similar = table.Column<long>(type: "bigint", nullable: false),
                    score = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_livros_similares", x => new { x.id_livro, x.posicao });
                    table.ForeignKey(
                        name: "fk_similar_livro",
                        column: x => x.id_livro,
                        principalTable: "livros",
                        principalColumn: "id_livro",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_similar_livro_alvo",
                        column: x => x.id_livro_similar,
                        principalTable: "livros",
                        principalColumn: "id_livro",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_livros_similares_id_livro_similar",
                table: "livros_similares",
                column: "id_livro_similar");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "livros_similares");
        }
    }
}
