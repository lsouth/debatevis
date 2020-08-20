class Speaker():


    def __init__(self, name):
        known_moderators = ["Guthrie", "Cooper","Holt","Diaz-Balart","Burnett","Lacey","Salinas","Ramos","Bash","Member","Mitchell","Ramsey","Maddow","Lemon","Alcindor","Alberta","Nawaz","Muir","Cortez","Dickerson","Blitzer","Woodruff","Obradovich","Raddatz","Carlos Lopez","Ifill","Wallace","Tapper","Garrett","Todd","Cordes","Tumulty","Kelly","Baier","Welker","Parker","Stephanopoulos","Davis","Aisha Harris"]

        known_candidates = ["Sanders","Warren","Biden","Buttigieg","Castro","O'Rourke","De Blasio","Harris","Booker","Klobuchar","Gabbard","Gillibrand","Bennet","Hickenlooper","Ryan","Bullock","Delaney","Swalwell","Steyer","Clinton","Trump","Jeb Bush","Scott Walker","Rand Paul","Chris Christie","Ted Cruz","Marco Rubio","Mike Huckabee","Ben Carson","John Kasich","Lincoln Chafee","Jim Webb","Carly Fiorina", "Mike Bloomberg","Andrew Yang"]

        split = name.split(" ")
        self.first_name = split[0].title()
        if len(split) == 3:
            self.last_name = split[-2].title() + " " + split[-1].title()
        else:
            self.last_name = split[-1].title()

        self.id = self.last_name.lower().replace(" ","-").replace("'","-")
        if self.last_name == "O'Malley":
            self.id = "omalley"
        self.debates = []
        self.title = ""
        self.is_moderator = self.last_name not in known_candidates or name.title() in known_moderators or self.last_name in known_moderators or self.first_name == "Moderator" or self.last_name == "Moderator"
        if name.title() in known_candidates:
            self.is_moderator = False
        self.total_utterances = 0
        self.source_count = 0
        self.target_count = 0

    def __str__(self):
        return self.title + " " + self.first_name + " " + self.last_name + ("(Moderator)" if self.is_moderator else "")
